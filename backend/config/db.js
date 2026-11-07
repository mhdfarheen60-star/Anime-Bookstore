import dns from "node:dns";
import mongoose from "mongoose";

// Some hosts (including certain Windows/container resolvers) refuse SRV
// queries for `_mongodb._tcp`, which breaks every `mongodb+srv://` URI even
// though the cluster itself is healthy. Try the system resolver first, then
// fall back to well-known public resolvers before giving up.
const PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];
let usingPublicDns = false;
let lastFailure = null;

const getSrvHostname = (uri) => {
  try {
    return new URL(uri.replace(/^mongodb\+srv:/, "https:")).hostname;
  } catch {
    return null;
  }
};

const ensureSrvResolution = async (uri) => {
  if (!uri.startsWith("mongodb+srv://")) return;
  const hostname = getSrvHostname(uri);
  if (!hostname) return;

  const srvName = `_mongodb._tcp.${hostname}`;
  try {
    await dns.promises.resolveSrv(srvName);
    return;
  } catch (error) {
    console.warn(
      `SRV lookup failed with the system resolver (${error?.code || error?.message}); retrying with public DNS.`
    );
  }

  dns.setServers(PUBLIC_DNS_SERVERS);
  usingPublicDns = true;
  await dns.promises.resolveSrv(srvName);
  console.log("SRV lookup succeeded using public DNS resolvers.");
};

// Validate MongoDB connection string without logging credentials.
const validateMongoUri = (uri) => {
  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. In Render, add it in the service Environment settings; locally use backend/.env."
    );
  }

  if (!/^mongodb(?:\+srv)?:\/\/\S+$/.test(uri)) {
    throw new Error(
      "MONGO_URI must start with mongodb:// or mongodb+srv:// and contain no spaces"
    );
  }
};

const sanitizeMongoError = (error) => {
  const uri = process.env.MONGO_URI || "";
  let msg = String(error?.message || error || "");
  // Never leak credentials if a driver error echoes the URI.
  if (uri) {
    try {
      const u = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:"));
      if (u.username) msg = msg.split(u.username).join("[REDACTED_USER]");
      if (u.password) msg = msg.split(u.password).join("[REDACTED_PASS]");
      if (u.host) msg = msg.split(u.host).join("[REDACTED_HOST]");
    } catch {
      /* ignore parse issues */
    }
  }
  return msg.replace(/mongodb(\+srv)?:\/\/[^\s@]+@/gi, "mongodb$1://[REDACTED]@");
};

const mongoTarget = (uri) => {
  if (!uri) return "MISSING";
  const scheme = uri.startsWith("mongodb+srv://") ? "mongodb+srv" : uri.startsWith("mongodb://") ? "mongodb" : "unknown";
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:"));
    const db = (u.pathname || "").replace(/^\//, "") || "(default)";
    return `${scheme}://${u.host || "[invalid-host]"}/${db}`;
  } catch {
    return `${scheme}://[unparseable]`;
  }
};

// Classify a failure without ever exposing credentials. The category is safe
// to return from the public health endpoint.
const classifyFailure = (error) => {
  if (!process.env.MONGO_URI) return "configuration";
  const msg = sanitizeMongoError(error);

  if (/MONGO_URI is not set|must start with mongodb/i.test(msg)) {
    return "configuration";
  }

  if (/querySrv|ENOTFOUND|EAI_AGAIN|getaddrinfo|ECONNREFUSED.*_mongodb/i.test(msg)) {
    return "dns";
  }

  if (/bad auth|Authentication failed|auth failed|SCRAM/i.test(msg)) {
    return "authentication";
  }

  if (/IP|whitelist|not allowed|Could not connect to any servers|server selection|timed out|ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
    return "network";
  }

  return "unknown";
};

// Provide useful error messages.
const explainFailure = (error) => {
  const category = classifyFailure(error);

  if (category === "configuration") {
    return "MONGO_URI is missing or malformed. Set it in the Render Environment settings (mongodb+srv://...).";
  }

  if (category === "dns") {
    return "SRV/DNS lookup failed. Check MONGO_URI (mongodb+srv host), Atlas cluster status, and that the host resolves.";
  }

  if (category === "authentication") {
    return "Authentication failed. Check Atlas database user, password (URL-encode special chars), and auth database in MONGO_URI.";
  }

  if (category === "network") {
    return "Atlas is unreachable from Render. In Atlas Network Access, allow Render egress (or 0.0.0.0/0 temporarily to verify), check cluster is running, and VPN/firewall settings.";
  }

  return "Unexpected MongoDB connection error. Verify MONGO_URI, Atlas Network Access, and cluster health.";
};

// Safe diagnostics for /api/health. Never include the URI or driver stack.
export const getDbDiagnostics = () => ({
  readyState: mongoose.connection.readyState,
  usingPublicDns,
  lastFailure,
});

// Connection event handlers.
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err?.name, sanitizeMongoError(err));
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

// Graceful shutdown.
process.once("SIGINT", async () => {
  try {
    await mongoose.connection.close();
  } catch {
    /* ignore */
  }
  console.log("MongoDB connection closed due to app termination");
  process.exit(0);
});

// Connect to MongoDB.
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGO_URI;

  validateMongoUri(mongoUri);

  const startedAt = Date.now();
  console.log(`Connecting to MongoDB (${mongoTarget(mongoUri)})...`);
  console.log(
    "MongoDB options: maxPoolSize=10, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000, socketTimeoutMS=45000, family=4"
  );

  try {
    await ensureSrvResolution(mongoUri);

    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    lastFailure = null;
    console.log(
      `MongoDB Connected Successfully in ${Date.now() - startedAt}ms (host: ${conn.connection.host}, database: ${conn.connection.name})`
    );

    return conn;
  } catch (error) {
    const safeMessage = sanitizeMongoError(error);
    const details = {
      name: error?.name || "Error",
      message: safeMessage,
      code: error?.code ?? null,
      category: classifyFailure(error),
      elapsedMs: Date.now() - startedAt,
      usingPublicDns,
      reason: error?.reason?.message ? sanitizeMongoError(error.reason) : undefined,
      syscall: error?.syscall,
      hostname: error?.hostname ? "[REDACTED_HOST]" : undefined,
    };
    lastFailure = {
      category: details.category,
      code: details.code,
      at: new Date().toISOString(),
    };
    console.error("MongoDB connection failed (startup cannot continue in production):", details);
    console.error("Troubleshooting:", explainFailure(error));
    if (details.category === "authentication") {
      console.error(
        "Checklist: Atlas Database Access user/password, URL-encode password special chars, authSource if required, and Render MONGO_URI has no quotes/extra whitespace."
      );
    } else if (details.category === "network" || details.category === "dns") {
      console.error(
        "Checklist: Atlas Network Access allows Render egress (or 0.0.0.0/0 to verify), cluster is running/not paused, and SRV host is correct."
      );
    }
    const wrapped = new Error(`MongoDB ${details.name}: ${safeMessage}`);
    wrapped.cause = undefined; // avoid leaking nested details
    throw wrapped;
  }
};

export default connectDB;