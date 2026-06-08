import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not defined in .env");
}

if (!(global as any).mongoose) {
  (global as any).mongoose = { conn: null, promise: null };
}
const cached = (global as any).mongoose;

export const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: "codeschool",
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

export const getDatabase = async () => {
  const conn = await connectDB();
  return conn.connection.db;
};