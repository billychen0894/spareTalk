"use client";

import ChatAction from "@components/chats/ChatAction";
import ChatInput from "@components/chats/ChatInput";
import ChatMessages from "@components/chats/ChatMessages";
import Menu from "@components/navigation/Menu";
import { SocketClient } from "@websocket/socket";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type ChatMessage = {
  sender: string;
  message: string;
  timestamp: string;
};

export type ChatRoom = {
  id: string;
  state: "idle" | "occupied";
  participants: string[];
};

export default function Home() {
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatConnected, setIsChatConnected] = useState<boolean>(false);
  const [startChatSession, setStartChatSession] = useState<boolean>(false);
  const [currChatRoom, setCurrChatRoom] = useState<ChatRoom | null>(null);
  const chatContainerRef = useRef<HTMLQuoteElement | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const socket = SocketClient.getInstance().getSocket();

  useEffect(() => {
    // Recover session if exists
    if (typeof window !== undefined) {
      const chatSessionObj = window.localStorage.getItem("chatSession");

      if (chatSessionObj) {
        const chatSession = JSON.parse(chatSessionObj) as {
          sessionId: string;
          chatRoomId: string;
        };

        socket.auth = {
          sessionId: chatSession?.sessionId,
          chatRoomId: chatSession?.chatRoomId,
        };
        socket.connect();

        setStartChatSession(true);

        // Retrieve chat messages when hard refresh or revist the site
        socket.emit("retrieve-chat-messages", chatSession?.chatRoomId);
      }

      if (currChatRoom && currChatRoom.participants.length !== 2) {
        setIsChatConnected(false);
      }
    }
  }, [socket, currChatRoom]);

  function startChatConnection() {
    setStartChatSession(true);
    socket.connect();
  }

  function disconnectChat() {
    if (socket) {
      if (typeof window !== undefined) {
        window.localStorage.removeItem("chatSession");
      }

      socket.emit("leave-chat", currChatRoom?.id);
      setIsChatConnected(false);
      setStartChatSession(false);
      setChatMessages([]);
      setCurrChatRoom(null);

      socket.disconnect();
    }
  }

  useEffect(() => {
    function onReceiveMessage(message: ChatMessage) {
      flushSync(() => {
        setChatMessages((prev) => [...prev, message]);
      });
    }

    function onChatConnected(chatRoom: ChatRoom) {
      if (chatRoom && chatRoom.state === "occupied") {
        console.log(chatRoom);
        setCurrChatRoom(chatRoom);
        setIsChatConnected(true);
      }
    }

    function onLeftChat(notification: string) {
      console.log(`Notification: ${notification}`);
      setIsChatConnected(false);
    }

    function startChat() {
      if (socket.connected && socket.id) {
        socket.emit("start-chat", socket.id);
      }
    }

    function connectError(err: any) {
      if (err) {
        setIsError(true);
        console.error(err.message);
      }
    }

    function onSession(session: { sessionId: string; chatRoomId: string }) {
      // set session obj to auth object
      socket.auth = {
        sessionId: session.sessionId,
        chatRoomId: session.chatRoomId,
      };

      if (typeof window !== undefined) {
        window.localStorage.setItem("chatSession", JSON.stringify(session));
      }
    }

    function onChatHistory(chatMessages: ChatMessage[]) {
      if (chatMessages.length >= 0) {
        console.log("fire");
        setChatMessages(chatMessages);
      }
    }

    socket.on("connect", startChat);
    socket.on("session", onSession);
    socket.on("receive-message", onReceiveMessage);
    socket.on("chatRoom-connected", onChatConnected);
    socket.on("left-chat", onLeftChat);
    socket.on("connect_error", connectError);
    socket.on("chat-history", onChatHistory);

    return () => {
      socket.off("connect", startChat);
      socket.off("receive-message", onReceiveMessage);
      socket.off("chatRoom-connected", onChatConnected);
      socket.off("left-chat", onLeftChat);
      socket.off("connect_error", connectError);
      socket.off("session", onSession);
      socket.off("chat-history", onChatHistory);
    };
  }, [socket, isChatConnected]);

  const handleSendMessage = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (!isChatConnected) return;
      if (newMessage === "") return;

      const auth = socket.auth as {
        sessionId?: string;
        chatRoomId?: string;
        [key: string]: any;
      };

      const socketSessionId = auth?.sessionId ? auth?.sessionId : socket.id;
      const chatRoomId = auth?.chatRoomId ? auth?.chatRoomId : "";

      const chatMessage: ChatMessage = {
        sender: socketSessionId,
        message: newMessage,
        timestamp: new Date().toISOString(),
      };

      socket.emit("send-message", chatRoomId, chatMessage);
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
          chatMessages={chatMessages}
          ref={chatContainerRef}
          socket={socket}
          isError={isError}
        />
      </main>
      <ChatInput
        startChatSession={startChatSession}
        handleDisconnectChat={disconnectChat}
        handleSendMessage={handleSendMessage}
        isChatConnected={isChatConnected}
        setNewMessage={setNewMessage}
        newMessage={newMessage}
        socket={socket}
      />
    </>
  );
}
