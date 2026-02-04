type Message = {
  accountId: string;
  content: string;
  conversationId: string;
  id: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

type PusherMessage = {
  sender: string;
  receiver: string;
  message: string;
};

type Messages = Message[];
