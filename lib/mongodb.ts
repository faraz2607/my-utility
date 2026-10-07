import { MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export async function getExpensesCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to your .env.local file");
  const clientPromise = globalForMongo.mongoClientPromise ?? new MongoClient(uri).connect();
  globalForMongo.mongoClientPromise = clientPromise;
  const connectedClient = await clientPromise;
  const database = process.env.MONGODB_DB || "pocketwise-dev";
  return connectedClient.db(database).collection("expenses");
}

export async function getUsersCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to your .env.local file");
  const clientPromise = globalForMongo.mongoClientPromise ?? new MongoClient(uri).connect();
  globalForMongo.mongoClientPromise = clientPromise;
  const connectedClient = await clientPromise;
  const database = process.env.MONGODB_DB || "pocketwise-dev";
  return connectedClient.db(database).collection("users");
}
