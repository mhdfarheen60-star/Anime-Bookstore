import mongoose from "mongoose";

// Validate MongoDB connection string without logging credentials.
const validateMongoUri = (uri) => {
  if (!uri) {
    throw new Error("MONGO_URI is not set in backend/.env");
  }

  if (!/^mongodb(?:\+srv)?:\/\/\S+$/.test(uri)) {
    throw new Error(
      "MONGO_URI must start with mongodb:// or mongodb+srv:// and contain no spaces"
    );
  }
};

// Provide useful error messages.
const explainFailure = (error) => {
  const msg = error.message || "";

  if (/querySrv/i.test(msg)) {
    return "SRV DNS lookup failed. Check DNS configuration.";
  }

  if (/bad auth|authentication failed/i.test(msg)) {
    return "Authentication failed. Check the Atlas database user, password, and authSource.";
  }

  if (/server selection|timed out|not allowed|whitelist/i.test(msg)) {
    return "Atlas is unreachable. Check Network Access, VPN, proxy, and firewall.";
  }

  return "Unexpected MongoDB connection error.";
};

// Connection event handlers.
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

// Graceful shutdown.
process.once("SIGINT", async () => {
  await mongoose.connection.close();

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
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    console.log(
      `MongoDB Connected Successfully (host: ${conn.connection.host}, database: ${conn.connection.name})`
    );

    return conn;
  } catch (error) {
    throw new Error(
      `${error.name}: ${error.message}. ${explainFailure(error)}`
    );
  }
};

export default connectDB;