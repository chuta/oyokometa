import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import { postgresClientOptions } from "./client-opts.js";

export * from "./schema.js";
export * from "./ledger.js";
export { schema };

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is required");
  if (_db) return _db;
  _sql = postgres(url, postgresClientOptions(url));
  _db = drizzle(_sql, { schema });
  return _db;
}

export async function closeDb() {
  await _sql?.end();
  _db = null;
  _sql = null;
}
