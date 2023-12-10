"use client";

import { createChatRoom } from "@actions/createChatRoom";
import Menu from "@components/navigation/Menu";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/20/solid";
import { socket } from "@websocket/socket";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useTransition } from "react";

type ChatMessage = {
  sender: string;
  receiver: string;
  message: string;
  timestamp: number;
};

type ChatRoom = {
  id: string;
  state: "idle" | "occupied";
  participants: Set<string>;
};

export default function Home() {
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatConnected, setIsChatConnected] = useState<boolean>(false);
  const [startChatSession, setStartChatSession] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [currChatRoom, setCurrChatRoom] = useState<ChatRoom | null>(null);
  const chatContainerRef = useRef<HTMLQuoteElement | null>(null);
  const [isLeftChat, setIsLeftChat] = useState<boolean>(false);

  function startChatConnection() {
    setStartChatSession(true);
    socket.connect();

    startTransition(async () => {
      // if there's existing idle chatRoom, connect to idle chatroom otherwise create one
      const response = await createChatRoom();
      const chatRoom = response;
      socket.emit("join-room", chatRoom);
    });
  }

  function disconnectChat() {
    if (socket) {
      socket.emit("leave-chat", currChatRoom?.id);
      setIsChatConnected(false);
      setStartChatSession(false);
      setChatMessages([]);
      setCurrChatRoom(null);
      setIsLeftChat(false);

      socket.disconnect();
    }
  }

  useEffect(() => {
    function onConnect() {
      if (socket.connected) {
        console.log(`Client ${socket.id}: connected`);
      }
    }

    function onMessaging(message: ChatMessage) {
      setChatMessages((prev) => [...prev, message]);
    }

    function onDisConnect() {
      if (socket.disconnected) {
        setIsChatConnected(false);
      }
    }

    function onChatConnected(chatRoom: ChatRoom) {
      socket.emit("chatRoom-connected", chatRoom);

      if (chatRoom && chatRoom.state === "occupied") {
        setCurrChatRoom(chatRoom);
        setIsChatConnected(true);
      }
    }

    function onLeftChat(notification: string) {
      console.log(`Notification: ${notification}`);
      setIsLeftChat(true);
    }

    socket.on("connect", onConnect);
    socket.on("chat-message", onMessaging);
    socket.on("disconnect", onDisConnect);
    socket.on("chatRoom-connected", onChatConnected);
    socket.on("left-chat", onLeftChat);
    return () => {
      socket.off("connect", onConnect);
      socket.off("chat-message", onMessaging);
      socket.off("disconnect", onDisConnect);
      socket.off("chatRoom-connected", onChatConnected);
      socket.off("left-chat", onLeftChat);
    };
  }, []);

  const handleSendMessage = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const chatMessage: ChatMessage = {
        sender: socket.id,
        receiver: "",
        message: newMessage,
        timestamp: Date.now(),
      };
      socket.emit("chat-message", chatMessage);
      setChatMessages((prev) => [...prev, chatMessage]);
      setNewMessage("");
    }
  };

  // messages should be differentiated with sender and receiver
  // when it's connected, the page should be auto-scroll to the latest messages
  // When users scroll up to see chat history, the auto-scroll should not take in effect, for UX

  return (
    <>
      <main className="text-white max-w-7xl mx-auto h-screen px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center relative">
        <Menu />
        <motion.div
          className="mx-auto max-w-3xl flex flex-col justify-center items-center space-y-16"
          animate={startChatSession ? "start" : "end"}
          variants={{
            start: { opacity: 0, y: -20 },
            end: { opacity: 1, y: 0 },
          }}
        >
          <div className="drop-shadow-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            <ChatBubbleOvalLeftEllipsisIcon className="text-white h-12 w-12 mx-auto" />
            <h1 className="text-5xl md:text-8xl font-bold ">SpareTalk</h1>
          </div>
          <Button
            className="bg-white bg-opacity-20 backdrop-blur-lg shadow-lg hover:bg-transparent font-semibold text-2xl py-8 px-6"
            onClick={startChatConnection}
          >
            Start Chat
          </Button>
        </motion.div>

        {startChatSession && (
          <motion.blockquote
            ref={chatContainerRef}
            className="bg-white bg-opacity-20 backdrop-blur-lg p-8 rounded-t-lg shadow-lg min-h-[12rem] max-w-[32rem] w-full absolute bottom-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {/* Show connecting state */}
            {/* Show connected state */}
            {/* Show read messages state */}
            {/* Show if person left the chat state */}
            {/* show current time */}
            <div className="text-center leading-6">
              Searching for someone to chat...
            </div>
            {isChatConnected && (
              <div className="text-center leading-6 p-2">
                Connection completed, start to chat!
              </div>
            )}
            {/* TODO: Revisit this differentiation of sender and receiver messages */}
            {chatMessages.map((message, i) => {
              return socket.id === message.sender ? (
                <div key={i} className="text-blue-500 leading-7">
                  {chatMessages[i].message}
                </div>
              ) : (
                <div key={i} className="leading-7 text-red-500">
                  {message.message}
                </div>
              );
            })}
            {isLeftChat && (
              <div className="text-center leading-6 p-2">
                The other person has left the chat, please click on Leave button
                back to homepage.
              </div>
            )}
          </motion.blockquote>
        )}
      </main>

      {startChatSession && (
        <motion.div
          className="shadow-lg sticky bottom-0 left-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <form className="w-full flex items-center bg-[#FCFAFA]">
            <Button
              type="button"
              className="bg-transparent hover:bg-transparent font-bold text-base leading-6 text-rose-500 hover:text-rose-400"
              onClick={disconnectChat}
            >
              Leave
            </Button>
            <Label htmlFor="chatInput" className="sr-only">
              Type your message:, Chat Input
            </Label>
            <Input
              type="text"
              id="chatInput"
              placeholder="Type your message here..."
              className="m-1 text-black text-base leading-6 ring-offset-red-300 bg-[#FCFAFA] border-gray-600/40 focus-visible:ring-transparent focus-visible:ring-offset-0 placeholder:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
              onChange={(e) => setNewMessage(e.target.value)}
              value={newMessage}
              onKeyDown={handleSendMessage}
              disabled={isLeftChat}
            />
          </form>
        </motion.div>
      )}
    </>
  );
}
