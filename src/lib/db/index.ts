import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and start the database with `npm run db:up`.",
  );
}

// Hot reloads in `next dev` re-run this module; without reusing the client,
// every reload opens a fresh pool and the old ones hold their connections
// until Postgres runs out ("too many clients already").
const globalForDb = globalThis as unknown as { hostayoDbClient?: ReturnType<typeof postgres> };
const client = globalForDb.hostayoDbClient ?? postgres(connectionString, { max: 10, idle_timeout: 30 });
if (process.env.NODE_ENV !== "production") globalForDb.hostayoDbClient = client;

export const db = drizzle(client, { schema });
export { schema };
