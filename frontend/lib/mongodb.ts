import { MongoClient, Db, GridFSBucket } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

if (!dbName) {
  throw new Error("Please define MONGODB_DB in .env.local");
}

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise =
  globalForMongo.mongoClientPromise ??
  new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo.mongoClientPromise = clientPromise;
}

export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

// Alias for compatibility with existing API routes.
export async function getMongoDB(): Promise<Db> {
  return getMongoDb();
}

export async function getGridFSBucket(): Promise<GridFSBucket> {
  const db = await getMongoDb();

  return new GridFSBucket(db, {
    bucketName: "medicine_files",
  });
}

export default clientPromise;
