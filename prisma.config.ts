import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // Migrations (DDL) want a direct, non-pooled connection. On Neon use the
    // unpooled connection string for DIRECT_DATABASE_URL; falls back to the
    // pooled DATABASE_URL for local/simple setups.
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
