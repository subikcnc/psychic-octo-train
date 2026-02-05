import ChatList from "@/components/chat/chatList";
import { getAllUsers, getUser } from "@/lib/actions/user.action";

const ChatPage = async () => {
  const data = await getUser();
  const allUsers = await getAllUsers();
  console.log("In chat page", data);

  return (
    <div className="w-full h-screen">
      <ChatList loggedInUser={data} users={allUsers} />{" "}
    </div>
  );
};

export default ChatPage;
