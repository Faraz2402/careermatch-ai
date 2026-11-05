// Runs before `prisma generate` in the Vercel build. Local development uses
// SQLite; when DATABASE_URL points at Postgres (e.g. Supabase on Vercel),
// switch the schema's datasource to postgresql. Uses the unpooled URL for
// schema changes when one is provided.
import fs from "node:fs";

const file = new URL("../prisma/schema.prisma", import.meta.url);
const url = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.log("[prisma-provider] DATABASE_URL is not Postgres - keeping SQLite.");
  process.exit(0);
}
let schema = fs.readFileSync(file, "utf8");
const direct = process.env.DATABASE_URL_UNPOOLED ? '\n  directUrl = env("DATABASE_URL_UNPOOLED")' : "";
schema = schema.replace(
  /datasource db \{[\s\S]*?\n\}/,
  `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")${direct}\n}`,
);
fs.writeFileSync(file, schema);
console.log(`[prisma-provider] Using PostgreSQL${direct ? " (direct URL for schema sync)" : ""}.`);
