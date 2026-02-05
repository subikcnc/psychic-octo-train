"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "../ui/textarea";
import {
  getMessages,
  sendMessage,
  updateMessageIsReadStatus,
} from "@/lib/actions/message.action";
import { ScrollArea } from "../ui/scroll-area";
import Pusher from "pusher-js";
import { getConversationId } from "@/lib/actions/conversation.action";
import { sendTypingStatus } from "@/lib/actions/typing.action";
import { FunnyTypingIndicator } from "./funnyTypingIndicator";
import { useToken } from "@/context/tokenProvider";
import { useRouter } from "next/navigation";

interface ChatListProps {
  loggedInUser: {
    id: string;
    email: string;
    username: string;
  };
  users: {
    id: string;
    email: string;
    name: string;
  }[];
}

const ChatList = ({ loggedInUser, users }: ChatListProps) => {
  const { setToken } = useToken();
  const pusherRef = useRef<Pusher | null>(null);
  const pusherNewMessagesRef = useRef<Pusher | null>(null);
  const pusherTypingRef = useRef<Pusher | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    email: string;
    name: string;
    id: string;
  } | null>(users.filter((user) => user.id !== loggedInUser.id)[0] || null);
  const [messageToSend, setMessageToSend] = useState<string>("");
  const [allMessages, setAllMessages] = useState<Messages>([]);
  const [currentConversationId, setCurrentConversationId] =
    useState<string>("");
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState<boolean>(false);
  const [lastTypedAt, setLastTypedAt] = useState<Date | null>(null);
  const [showTypingIndicator, setShowTypingIndicator] =
    useState<boolean>(false);
  const router = useRouter();
  const isMessageBoxFocused = useRef<boolean>(false);

  function throttle<Args extends unknown[], Return>(
    fn: (...args: Args) => Return,
    delay: number,
  ) {
    let lastCall = 0;
    return (...args: Args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  }
  const throttledStatusUpdate = useMemo(
    () => throttle(sendTypingStatus, 1500),
    [],
  );

  // useEffect(() => {
  //   setAllMessages([]);
  // }, [selectedUser]);

  // This effect is to bind to specific user pusher trigger for new messages
  useEffect(() => {
    if (!pusherNewMessagesRef.current) {
      pusherNewMessagesRef.current = new Pusher(
        process.env.NEXT_PUBLIC_PUSHER_KEY!,
        {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        },
      );
    }

    const channel = pusherNewMessagesRef.current.subscribe(
      `new-message-for-${loggedInUser.id}`,
    );
    channel.bind(
      "new-incoming-message",
      (data: {
        senderId: string;
        receiverId: string;
        content: string;
        conversationId: string;
      }) => {
        console.log("Data got from new message channel", data);
      },
    );

    return () => {
      channel.unbind_all();
      pusherNewMessagesRef.current?.unsubscribe(
        `new-message-for-${loggedInUser.id}`,
      );
    };
  }, [loggedInUser]);

  // This effect is for showing a typing indicator
  useEffect(() => {
    if (!pusherTypingRef.current) {
      pusherTypingRef.current = new Pusher(
        process.env.NEXT_PUBLIC_PUSHER_KEY!,
        {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        },
      );
    }
    const channel = pusherTypingRef.current.subscribe(
      `chat-${currentConversationId}`,
    );
    channel.bind(
      "typing",
      (data: { typing: "typing" | "stopped"; senderId: string }) => {
        setShowTypingIndicator(
          data.typing === "typing" && data.senderId !== loggedInUser.id,
        );
      },
    );
    return () => {
      channel.unbind_all();
      pusherTypingRef?.current?.unsubscribe(`chat-${currentConversationId}`);
    };
  }, [currentConversationId, loggedInUser.id]);

  // Another useEffect to check if isCurrentlyTyping is true to then broadcast the message to pusher
  useEffect(() => {
    if (isCurrentlyTyping) {
      // Now we need to delay calling the server action below
      isMessageBoxFocused.current = true;
      if (!currentConversationId) return;
      console.log("Calling the server action when status is typing");
      throttledStatusUpdate({
        conversationId: currentConversationId,
        status: "typing",
        senderId: loggedInUser.id,
      });
    } else {
      sendTypingStatus({
        conversationId: currentConversationId,
        status: "stopped",
        senderId: loggedInUser.id,
      });
    }
  }, [
    isCurrentlyTyping,
    currentConversationId,
    lastTypedAt,
    throttledStatusUpdate,
    loggedInUser.id,
  ]);

  // This useeffect to handle the typing status
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setIsCurrentlyTyping(false);
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [isCurrentlyTyping, lastTypedAt]);

  useEffect(() => {
    if (!currentConversationId) return;
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });
    }

    const channelName = `chat-${currentConversationId}`;
    console.log("this is the channel name", channelName);

    const channel = pusherRef.current.subscribe(channelName);

    channel.bind("new-message", (data: Message) => {
      console.log(
        "New messages got from pusher for current conversation",
        data,
      );
      setAllMessages((prev) => [...prev, data]);
      // Here since we already got all the data we need to then update the isRead boolean to true
      async function markMessagesRead() {
        if (
          !currentConversationId ||
          !loggedInUser.id ||
          !selectedUser ||
          !selectedUser.id
        )
          return;
        const response = await updateMessageIsReadStatus(
          currentConversationId,
          loggedInUser.id,
          selectedUser.id,
        );
        console.log("Response after updating read status", response);
      }
      markMessagesRead();
    });

    return () => {
      channel.unbind_all();
      pusherRef?.current?.unsubscribe(channelName);
    };
  }, [currentConversationId, loggedInUser.id, selectedUser]);

  useEffect(() => {
    const fetchConversationId = async () => {
      const conversationId = await getConversationId({
        senderId: loggedInUser.id,
        receiverId: selectedUser!.id,
      });
      console.log("Conversation ID", conversationId);
      setCurrentConversationId(conversationId);
    };
    fetchConversationId();
  }, [loggedInUser, selectedUser]);

  // Need to fetch the initial messages when the component mounts and the user selects a particular user
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentConversationId) return;
      const messages = await getMessages(currentConversationId);
      setAllMessages(messages);
    };
    console.log("Fetching new messages since the conversation id changed");
    fetchMessages();
  }, [currentConversationId]);

  const handleSend = async () => {
    console.log("Handling send", loggedInUser.email, selectedUser?.email);
    const data = await sendMessage({
      senderEmail: loggedInUser.email,
      receiverEmail: selectedUser!.email,
      content: messageToSend,
    });
    setMessageToSend("");
    console.log("response", data);

    // As soon as sending the message we need to get the message and then append it in the UI
    const { conversationId } = data;
    setCurrentConversationId(conversationId);
    // const messages = await getMessages(conversationId);
    // setAllMessages(messages);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      localStorage.removeItem("accountToken");
      setToken("");
      router.push("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="w-full p-12 rounded-[16px] h-screen">
      <div className="grid grid-cols-[1fr_2fr] h-full border border-chat-background">
        <div className="flex flex-col gap-1 bg-chat-background">
          <div className="px-5 py-6">
            <span className="capitalize font-bold">{`${loggedInUser.username}'s Chat`}</span>{" "}
            {/* {showTypingIndicator && "is typing"} */}
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex flex-col flex-1">
              {users.map(
                (user) =>
                  user.email !== loggedInUser.email && (
                    <Button
                      key={user.email}
                      onClick={() => {
                        setSelectedUser(user);
                        setCurrentConversationId("");
                      }}
                      variant="outline"
                      className={cn(
                        "w-full justify-start rounded-none border-0 px-5! py-2! cursor-pointer shadow-none bg-transparent",
                        selectedUser?.email === user.email &&
                          "bg-chat-active-background text-black hover:bg-chat-active-background hover:text-black",
                      )}
                    >
                      <span className="uppercase font-bold">{user.name}</span>
                    </Button>
                  ),
              )}
            </div>
            <div>
              <div className="px-5 py-6">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full cursor-pointer"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
        {selectedUser ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* Previous messages area */}
            <div className="w-full px-5 py-6">
              Messaging{" "}
              <span className="font-bold uppercase">{selectedUser?.name}</span>
            </div>
            <div className="flex flex-col flex-1 px-5 gap-4">
              <ScrollArea className="flex-1 border rounded-md h-full">
                <div className="flex flex-col  gap-2 p-4 h-full justify-end">
                  {allMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-2",
                        message.accountId === loggedInUser.id && "justify-end",
                      )}
                    >
                      <p
                        className={cn(
                          message.accountId === loggedInUser.id &&
                            "bg-chat-bubble-background text-black",
                          message.accountId !== loggedInUser.id &&
                            "bg-gray-300",
                          "p-2 rounded-md m-0",
                        )}
                      >
                        {message.content}
                      </p>
                    </div>
                  ))}
                  {showTypingIndicator && loggedInUser.id && (
                    <div className="flex gap-2">
                      <FunnyTypingIndicator username={selectedUser?.name} />
                    </div>
                  )}
                </div>
              </ScrollArea>
              <Textarea
                className="h-[10%]"
                placeholder={`Message ${selectedUser?.name}`}
                value={messageToSend}
                onInput={() => {
                  setIsCurrentlyTyping(true);
                  setLastTypedAt(new Date());
                  // throttledHandler.current();
                }}
                onChange={(e) => setMessageToSend(e.target.value)}
              />
              <Button
                variant="default"
                className="self-end mt-4 bg-chat-bubble-background text-black"
                onClick={handleSend}
              >
                Send
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center">
            <p className="text-xl font-bold">You are the only one here ☹️</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
