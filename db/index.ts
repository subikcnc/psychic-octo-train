import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { remember } from "@epic-web/remember";

const { Pool } = pg;

const createPool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
};

const client = remember("dbPool", () => createPool());
export const db = drizzle({ client, schema: {} });

export default db;
