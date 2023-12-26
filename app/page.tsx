"use client";

import ChatAction from "@components/chats/ChatAction";
import ChatInput from "@components/chats/ChatInput";
import ChatMessages from "@components/chats/ChatMessages";
import Menu from "@components/navigation/Menu";
import { SocketClient } from "@websocket/socket";
import { useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";

export type ChatMessage = {
  sender: string;
  receiver: string;
  message: string;
  timestamp: number;
};

export type ChatRoom = {
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
  const socket = SocketClient.getInstance().getSocket();

  function startChatConnection() {
    setStartChatSession(true);
    socket.connect();
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
    function onMessaging(message: ChatMessage) {
      flushSync(() => {
        setChatMessages((prev) => [...prev, message]);
      });
    }

    function onChatConnected(chatRoom: ChatRoom) {
      if (chatRoom && chatRoom.state === "occupied") {
        socket.emit("chatRoom-connected", chatRoom);
        setCurrChatRoom(chatRoom);
        setIsChatConnected(true);
      }
    }

    function onLeftChat(notification: string) {
      console.log(`Notification: ${notification}`);
      setIsLeftChat(true);
    }

    function startChat() {
      if (socket.connected && socket.id) {
        socket.emit("start-chat", socket.id);
      }
    }

    socket.on("connect", startChat);
    socket.on("chat-message", onMessaging);
    socket.on("chatRoom-connected", onChatConnected);
    socket.on("left-chat", onLeftChat);

    return () => {
      socket.off("connect", startChat);
      socket.off("chat-message", onMessaging);
      socket.off("chatRoom-connected", onChatConnected);
      socket.off("left-chat", onLeftChat);
    };
  }, [socket]);

  const handleSendMessage = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (!isChatConnected) return;
      if (newMessage === "") return;

      const participants = currChatRoom
        ? Array.from(currChatRoom?.participants)
        : [];
      const receiver =
        socket.id === participants[0] ? participants[1] : participants[0];
      const chatMessage: ChatMessage = {
        sender: socket.id,
        receiver,
        message: newMessage,
        timestamp: Date.now(),
      };

      socket.emit("chat-message", chatMessage);
      setChatMessages((prev) => [...prev, chatMessage]);

      let lastElement = chatContainerRef?.current?.lastElementChild;
      lastElement?.scrollIntoView();

      setNewMessage("");
    }
  };

  return (
    <>
      <main className="text-white w-full min-h-screen overflow-y-auto flex flex-col justify-center items-center scroll-smooth">
        <Menu />
        <ChatAction
          startChatSession={startChatSession}
          handleChatConnection={startChatConnection}
        />
        <ChatMessages
          startChatSession={startChatSession}
          isChatConnected={isChatConnected}
          isLeftChat={isLeftChat}
          chatMessages={chatMessages}
          ref={chatContainerRef}
          socket={socket}
        />
      </main>
      <ChatInput
        startChatSession={startChatSession}
        handleDisconnectChat={disconnectChat}
        handleSendMessage={handleSendMessage}
        isLeftChat={isLeftChat}
        setNewMessage={setNewMessage}
        newMessage={newMessage}
      />
    </>
  );
}
