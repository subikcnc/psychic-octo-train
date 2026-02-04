"use server";

import { pusher } from "../utils/pusher";


export const sendTypingStatus = async ({
  conversationId,
  status,
  senderId,
}: {
  conversationId: string;
  status: "typing" | "stopped";
  senderId: string;
}) => {
  console.log(
    `Triggering a ${status} event for conversation ${conversationId} with senderId ${senderId}`,
  );
  await pusher.trigger(`${"chat-" + conversationId}`, "typing", {
    typing: status,
    senderId,
  });
};
