import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

let cachedDb: PostgresJsDatabase | null = null;

export function getDb(): PostgresJsDatabase {
  if (cachedDb) {
    return cachedDb;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  cachedDb = drizzle(process.env.DATABASE_URL);
  return cachedDb;
}

// Export a concrete Drizzle instance (not a Proxy) so adapters can detect the DB type
export const db: PostgresJsDatabase = getDb();
