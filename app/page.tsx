"use client";

import { createChatRoom } from "@actions/createChatRoom";
import ChatAction from "@components/chats/ChatAction";
import ChatInput from "@components/chats/ChatInput";
import ChatMessages from "@components/chats/ChatMessages";
import Menu from "@components/navigation/Menu";
import { socket } from "@websocket/socket";
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

  function startChatConnection() {
    setStartChatSession(true);
    socket.connect();

    startTransition(async () => {
      // TODO: if server is down, implement error handling on fetch error
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

  // useEffect(() => {
  //   chatContainerRef?.current?.scrollIntoView({ behavior: "smooth" });
  // }, [chatMessages]);

  useEffect(() => {
    function onMessaging(message: ChatMessage) {
      flushSync(() => {
        setChatMessages((prev) => [...prev, message]);
      });
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

    socket.on("chat-message", onMessaging);
    socket.on("chatRoom-connected", onChatConnected);
    socket.on("left-chat", onLeftChat);

    return () => {
      socket.off("chat-message", onMessaging);
      socket.off("chatRoom-connected", onChatConnected);
      socket.off("left-chat", onLeftChat);
    };
  }, []);

  const handleSendMessage = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

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
