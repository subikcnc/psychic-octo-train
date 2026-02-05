"use server";

import db from "@/db";
import {
  accounts,
  conversationParticipants,
  conversations,
  messages,
} from "@/db/schema";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { pusher } from "../utils/pusher";
import { getUser } from "./user.action";

export async function createMessage() {}

export async function getMessagesByUserId(userId: string) {
  try {
    const storedMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.accountId, userId))
      .limit(10)
      .orderBy(desc(messages.createdAt));

    if (!storedMessages) throw new Error("No messages found");

    // Send all the messages back to the client based on what the conversation id is
    return JSON.parse(JSON.stringify(storedMessages));
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Internal server error",
    );
  }
}

export async function updateMessageIsReadStatus(
  conversationId: string,
  senderId: string,
  receiverId: string,
) {
  // Here we need to update that the message has been read
  // First look at the conversation participants table
  // Get all the conversations, for that id, the accountId here is the sender,
  // check if the currently logged in user is not in the accountid and has loaded the message, this marks the message as read
  const { id: loggedInUserId, email, username } = await getUser();
  // if (loggedInUserId === senderId) return;
  console.log("---------------------------------------------------------");
  console.log(
    "This is the id in the server action",
    loggedInUserId,
    email,
    username,
  );
  console.log("These are the parameter values", senderId, receiverId);
  if (loggedInUserId !== senderId) {
    console.log("this is the reciver");
  } else {
    console.log("This is the sender");
  }
  console.log("---------------------------------------------------------");
  const allUnreadMessages = await db // This should be an array
    .select({
      id: messages.id,
      accountId: messages.accountId,
      content: messages.content,
    })
    .from(messages)
    .where(
      and(
        ne(messages.accountId, loggedInUserId),
        eq(messages.conversationId, conversationId),
        eq(messages.isRead, false),
      ),
    );

  if (allUnreadMessages.length === 0) {
    return { message: "No unread messages" };
  }
  // After getting all unread messages need to check the receiverId with the currently logged in user, if same then change the unread status to true
  await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        ne(messages.accountId, loggedInUserId),
        eq(messages.conversationId, conversationId),
        eq(messages.isRead, false),
      ),
    );
  return {
    conversationId,
    senderId,
    receiverId,
    message: "Message read status updated",
    allUnreadMessages,
    loggedInId: loggedInUserId,
  };
}

export async function getMessages(conversationId: string) {
  try {
    const storedMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .limit(10)
      .orderBy(asc(messages.createdAt));

    if (!storedMessages) throw new Error("No messages found");

    // Send all the messages back to the client based on what the conversation id is
    return JSON.parse(JSON.stringify(storedMessages));
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Internal server error",
    );
  }
}

interface SendMessageProps {
  senderEmail: string;
  receiverEmail: string;
  content: string;
}

export async function sendMessage({
  senderEmail,
  receiverEmail,
  content,
}: SendMessageProps) {
  try {
    const sender = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, senderEmail));
    const receiver = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, receiverEmail));

    // console.log("Sender and receiver are", sender, receiver);

    if (!sender || !receiver) throw new Error("Sender or receiver not found");

    // Check if these accounts are participating for the first time
    const cp1 = alias(conversationParticipants, "cp1");
    const cp2 = alias(conversationParticipants, "cp2");

    const [existingConversation] = await db
      .select({ conversationId: cp1.conversationId })
      .from(cp1)
      .innerJoin(cp2, eq(cp1.conversationId, cp2.conversationId))
      .where(
        and(eq(cp1.accountId, sender[0].id), eq(cp2.accountId, receiver[0].id)),
      );

    if (existingConversation) {
      // console.log("no need to create a new conversation");
      // They have already conversed before so need to get the conversation id from the conversation participants table
      const conversationId = existingConversation.conversationId;
      const [insertedMessage] = await db
        .insert(messages)
        .values({
          content,
          conversationId,
          accountId: sender[0].id,
        })
        .returning({
          id: messages.id,
        });
      // console.log("Inserted message is", insertedMessage);
      // Need to get all the messages from the conversation
      const allMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId));
      // console.log("Messages are", allMessages);
      await pusher.trigger(
        `new-message-for-${receiver[0].id}`,
        "new-incoming-message",
        {
          senderId: sender[0].id,
          conversationId: conversationId,
          receiverId: receiver[0].id, //If we can attach the receiver id and if he/she is not currently focused on this conversation, then we can notify them
          content: content,
        },
      );
      await pusher.trigger(`${"chat-" + conversationId}`, "new-message", {
        accountId: sender[0].id,
        content: content,
        conversationId: conversationId,
        id: insertedMessage.id,
        isRead: false, // Since it defaults to false by schema design, should it be false here?
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return {
        message: "Message sent successfully",
        conversationId: conversationId,
      };
    } else {
      // console.log("Creating a new conversation");
      // This is their first conversation
      const [conversation] = await db
        .insert(conversations)
        .values({})
        .returning({
          id: conversations.id,
        });

      await db.insert(conversationParticipants).values({
        accountId: sender[0].id,
        conversationId: conversation.id,
      });

      await db.insert(conversationParticipants).values({
        accountId: receiver[0].id,
        conversationId: conversation.id,
      });

      const [insertedMessage] = await db
        .insert(messages)
        .values({
          content,
          conversationId: conversation.id,
          accountId: sender[0].id,
        })
        .returning({
          id: messages.id,
        });

      await pusher.trigger(
        `new-message-for-${receiver[0].id}`,
        "new-incoming-message",
        {
          conversationId: conversation.id,
          senderId: sender[0].id,
          receiverId: receiver[0].id, //If we can attach the receiver id and if he/she is not currently focused on this conversation, then we can notify them
          content: content,
        },
      );

      await pusher.trigger(`${"chat-" + conversation.id}`, "new-message", {
        accountId: sender[0].id,
        content: content,
        conversationId: conversation.id,
        id: insertedMessage.id,
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        conversationId: JSON.parse(JSON.stringify(conversation.id)),
        message: "New Message sent successfully",
      };

      //   await db.insert(conversationParticipants).values({});
    }

    // const conversation = await db
    //   .select()
    //   .from(conversations)
    //   .where(eq(conversations.id, conversationId));
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Internal server error",
    );
  }
}
