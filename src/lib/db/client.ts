// Neon serverless + Drizzle client.
//
// IMPORTANT: This file is server-only (imports `@neondatabase/serverless`,
// which uses Node/edge APIs). Only import it from:
//   - `*.server.ts` modules
//   - `createServerFn(...).handler(...)` bodies
//   - `createAPIFileRoute(...)` handler bodies
//
// On edge runtimes (Vercel Edge / Cloudflare Workers) env binds at REQUEST
// time, so we read `NEON_DATABASE_URL` lazily inside `getDb()`, not at
// module scope.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type DB = NeonHttpDatabase<typeof schema>;

let cachedSql: NeonQueryFunction<false, false> | null = null;
let cachedDb: DB | null = null;
let cachedUrl: string | null = null;

function getDatabaseUrl(): string {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) {
    throw new Error(
      "NEON_DATABASE_URL is not set. Copy .env.example to .env and add your Neon pooled connection string.",
    );
  }
  return url;
}

export function getDb(): DB {
  const url = getDatabaseUrl();
  if (cachedDb && cachedUrl === url) return cachedDb;
  cachedSql = neon(url);
  cachedDb = drizzle(cachedSql, { schema });
  cachedUrl = url;
  return cachedDb;
}

export { schema };
