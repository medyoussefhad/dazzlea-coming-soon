import { MongoClient, type Db } from "mongodb";

/**
 * Serverless-safe MongoDB client with lazy initialization.
 *
 * The client/connection is created on first use (inside getDb), not at module
 * import time, so a missing MONGODB_URI never breaks the build or the landing
 * page — only code that actually queries the database will surface the error.
 *
 * On Vercel each serverless invocation may reuse a warm Lambda, so we cache the
 * connection promise on the global object to avoid exhausting the connection
 * pool across invocations (and across HMR reloads in development).
 */

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
};

declare global {
  // eslint-disable-next-line no-var
  var _dazzleaMongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to your environment variables.");
  }
  if (process.env.NODE_ENV === "development") {
    if (!global._dazzleaMongoClientPromise) {
      global._dazzleaMongoClientPromise = new MongoClient(uri, options).connect();
    }
    return global._dazzleaMongoClientPromise;
  }
  if (!global._dazzleaMongoClientPromise) {
    global._dazzleaMongoClientPromise = new MongoClient(uri, options).connect();
  }
  return global._dazzleaMongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const dbName = process.env.MONGODB_DB || "dazzlea";
  const client = await getClientPromise();
  return client.db(dbName);
}
