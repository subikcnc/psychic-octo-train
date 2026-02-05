"use server";

import db from "@/db";
import { conversationParticipants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function createConversation() {}

export async function getConversationId({
  senderId,
  receiverId,
}: {
  senderId: string;
  receiverId: string;
}) {
  const cp1 = alias(conversationParticipants, "cp1");
  const cp2 = alias(conversationParticipants, "cp2");

  const [conversation] = await db
    .select({ conversationId: cp1.conversationId })
    .from(cp1)
    .innerJoin(cp2, eq(cp1.conversationId, cp2.conversationId))
    .where(and(eq(cp1.accountId, senderId), eq(cp2.accountId, receiverId)));

  // console.log("This is the conversation", conversation);
  return conversation?.conversationId;
}
