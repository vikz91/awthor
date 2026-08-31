import "server-only";

import { type Db, MongoClient, ServerApiVersion } from "mongodb";
import { mongoConfiguration } from "./config";

declare global {
  var awthorMongoClientPromise: Promise<MongoClient> | undefined;
}

const mongoClientOptions = {
  appName: "awthor",
  serverApi: {
    deprecationErrors: true,
    strict: true,
    version: ServerApiVersion.v1,
  },
} as const;

function createMongoClientPromise(uri: string): Promise<MongoClient> {
  return new MongoClient(uri, mongoClientOptions).connect();
}

/** Returns the process-reused MongoDB client for future authenticated sync work. */
export function getMongoClient(): Promise<MongoClient> {
  if (!mongoConfiguration.uri) {
    throw new Error("MongoDB is not configured. Set MONGODB_URI before enabling sync services.");
  }

  globalThis.awthorMongoClientPromise ??= createMongoClientPromise(mongoConfiguration.uri);
  return globalThis.awthorMongoClientPromise;
}

/** Returns Awthor's private sync database. This must only be called from server code. */
export async function getAwthorDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(mongoConfiguration.databaseName);
}
