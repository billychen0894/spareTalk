import { ChatMessage } from "@page";
import { socket } from "@websocket/socket";
import { motion } from "framer-motion";
import { ForwardedRef, forwardRef } from "react";

type ChatMessagesProps = {
  startChatSession: boolean;
  isChatConnected: boolean;
  isLeftChat: boolean;
  chatMessages: ChatMessage[];
};

export default forwardRef(function ChatMessages(
  {
    startChatSession,
    isChatConnected,
    isLeftChat,
    chatMessages,
  }: ChatMessagesProps,
  ref: ForwardedRef<HTMLQuoteElement | null>
) {
  if (!startChatSession) return null;

  return (
    <motion.blockquote
      ref={ref}
      className="bg-white bg-opacity-20 backdrop-blur-lg p-8 rounded-t-lg shadow-lg min-h-[12rem] max-w-[32rem] w-full absolute bottom-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="text-center leading-6">
        Searching for someone to chat...
      </div>
      {isChatConnected && (
        <div className="text-center leading-6 p-2">
          Connection completed, start to chat!
        </div>
      )}
      {chatMessages.map((message, i) => {
        return socket.id === message.sender ? (
          <div key={i} className="text-blue-500 leading-7">
            {message.message}
          </div>
        ) : (
          <div key={i} className="leading-7 text-red-500">
            {message.message}
          </div>
        );
      })}
      {isLeftChat && (
        <div className="text-center leading-6 p-2">
          The other person has left the chat, please click on Leave button back
          to homepage.
        </div>
      )}
    </motion.blockquote>
  );
});
