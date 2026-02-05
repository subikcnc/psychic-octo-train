"use server";

import db from "@/db";
import { conversationParticipants, conversations } from "@/db/schema";
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
  if (!conversation) {
    const [newConversation] = await db
      .insert(conversations)
      .values({})
      .returning({
        id: conversations.id,
      });

    await db.insert(conversationParticipants).values({
      accountId: senderId,
      conversationId: newConversation.id,
    });
    await db.insert(conversationParticipants).values({
      accountId: receiverId,
      conversationId: newConversation.id,
    });

    return newConversation.id;
  }

  return conversation?.conversationId;
}
