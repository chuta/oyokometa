import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { postgresClientOptions } from "./client-opts.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../drizzle");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = postgres(url, { ...postgresClientOptions(url), max: 1 });
  await sql`create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())`;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const already = await sql`select id from schema_migrations where id = ${file}`;
    if (already.length) continue;
    const body = readFileSync(join(dir, file), "utf8");
    await sql.unsafe(body);
    await sql`insert into schema_migrations (id) values (${file})`;
    console.log("applied", file);
  }
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
