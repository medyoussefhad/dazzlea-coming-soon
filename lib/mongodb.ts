import { MongoClient, type Db } from "mongodb";

/**
 * Serverless-safe MongoDB client.
 *
 * On Vercel each serverless invocation may reuse a warm Lambda, so we cache the
 * connection promise on the global object to avoid exhausting the connection
 * pool across invocations (and across HMR reloads in development).
 */

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "dazzlea";

if (!uri) {
  throw new Error("MONGODB_URI is not set. Add it to your environment variables.");
}

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
};

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _dazzleaMongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._dazzleaMongoClientPromise) {
    global._dazzleaMongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._dazzleaMongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export default clientPromise;
