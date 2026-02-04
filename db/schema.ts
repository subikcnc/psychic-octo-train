import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const accountType = pgEnum("account_type", ["user", "vendor"]);

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: accountType("type").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastMessagedAt: timestamp("lastMessagedAt"),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversationId")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(), // This is the actual constraint
  accountId: uuid("accountId")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(), // This is the actual constraint
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversationId")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  accountId: uuid("accountId")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const accountRelations = relations(accounts, ({ many }) => ({
  conversationParticipants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  conversationParticipants: many(conversationParticipants),
  messages: many(messages),
}));

export const insertAccountSchema = createInsertSchema(accounts);
export const selectAccountSchema = createSelectSchema(accounts);
