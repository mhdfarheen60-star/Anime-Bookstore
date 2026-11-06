import mongoose from "mongoose";

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
  let msg = String(error?.message || "");
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

// Provide useful error messages.
const explainFailure = (error) => {
  const msg = sanitizeMongoError(error);

  if (/querySrv|ENOTFOUND|EAI_AGAIN|ECONNREFUSED.*_mongodb/i.test(msg)) {
    return "SRV/DNS lookup failed. Check MONGO_URI (mongodb+srv host), Atlas cluster status, and that the URI is correct.";
  }

  if (/bad auth|Authentication failed|auth failed|SCRAM/i.test(msg)) {
    return "Authentication failed. Check Atlas database user, password (URL-encode special chars), and auth database in MONGO_URI.";
  }

  if (/IP|whitelist|not allowed|Could not connect to any servers|server selection|timed out|ETIMEDOUT/i.test(msg)) {
    return "Atlas is unreachable from Render. In Atlas Network Access, allow Render egress (or 0.0.0.0/0 temporarily to verify), check cluster is running, and VPN/firewall settings.";
  }

  return "Unexpected MongoDB connection error. Verify MONGO_URI, Atlas Network Access, and cluster health.";
};

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

  try {
    console.log("Connecting to MongoDB Atlas...");

    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log(
      `MongoDB Connected Successfully (host: ${conn.connection.host}, database: ${conn.connection.name})`
    );

    return conn;
  } catch (error) {
    const safeMessage = sanitizeMongoError(error);
    console.error("MongoDB connection failed:", {
      name: error?.name,
      message: safeMessage,
      code: error?.code,
      reason: error?.reason?.message ? sanitizeMongoError(error.reason) : undefined,
    });
    console.error("Troubleshooting:", explainFailure(error));
    const wrapped = new Error(`MongoDB ${error?.name || "Error"}: ${safeMessage}`);
    wrapped.cause = undefined; // avoid leaking nested details
    throw wrapped;
  }
};

export default connectDB;