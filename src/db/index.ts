import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";

let _db: PostgresJsDatabase | null = null;

function getDb(): PostgresJsDatabase {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

// Proxy that lazily initializes the database connection
export const db = new Proxy({} as PostgresJsDatabase, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof PostgresJsDatabase];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
