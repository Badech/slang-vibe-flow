import { defineConfig } from "drizzle-kit";

// Drizzle reads NEON_DATABASE_URL from the environment. Use a Neon
// `-pooler` connection string for both migrations and the runtime
// serverless driver (works on Vercel/Cloudflare edge).
//
// Run:
//   bun run db:generate   → create new SQL migration from schema diff
//   bun run db:migrate    → apply pending migrations against $NEON_DATABASE_URL
//   bun run db:seed       → seed TERMS into the database
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
