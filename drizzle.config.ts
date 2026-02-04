import "dotenv/config"; // This loads .env.local automatically
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts", // your Drizzle tables
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgres://postgres:lol@localhost:5432/chat", // and this will be defined after we import dotenv/config
  },
  verbose: true,
  strict: true,
});
