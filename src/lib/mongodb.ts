import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not defined in .env");
}

let cached = (global as any).mongoose || { conn: null, promise: null };

export const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: "codeschool",
    }).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  console.log("✅ MongoDB connected successfully");
  return cached.conn;
};

// ✅ هنا الفرق الحقيقي
// بدلاً من conn.db (اللي بترجع undefined في mongoose)
// استخدم conn.connection.db لأنه هو اللي بيرجع كائن الـ Database الحقيقي
export const getDatabase = async () => {
  const conn = await connectDB();
  return conn.connection.db; // ✅ دي اللي لازم تستخدمها
};
