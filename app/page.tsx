"use client";

import ChatAction from "@components/chats/ChatAction";
import ChatInput from "@components/chats/ChatInput";
import ChatMessages from "@components/chats/ChatMessages";
import Menu from "@components/navigation/Menu";
import { SocketClient } from "@websocket/socket";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { v4 as uuidv4 } from "uuid";

export type ChatMessage = {
  id: string;
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
  const auth = socket.auth as {
    sessionId?: string;
    chatRoomId?: string;
    [key: string]: any;
  };

  useEffect(() => {
    // Recover session if exists
    if (typeof window !== undefined) {
      const chatSessionObj = window.localStorage.getItem("chatSession");

      if (chatSessionObj) {
        const { sessionId, chatRoomId } = JSON.parse(chatSessionObj) as {
          sessionId: string;
          chatRoomId: string;
        };

        // if there's chatRoom session
        if (sessionId && chatRoomId) {
          socket.auth = {
            sessionId,
            chatRoomId,
          };

          socket.connect();
          setStartChatSession(true);
          console.log("started chat");

          // Retrieve chat messages when hard refresh or revist the site
          const eventId = uuidv4();
          socket.emit("retrieve-chat-messages", chatRoomId, eventId);
        } else {
          window.localStorage.removeItem("chatSession");
          socket.auth = {
            sessionId: "",
            chatRoomId: "",
          };

          setIsChatConnected(false);
          console.log("chatIsConnected state change - 1", isChatConnected);
          setStartChatSession(false);
          setChatMessages([]);
          setCurrChatRoom(null);
          socket.disconnect();
        }
      }

      if (currChatRoom && currChatRoom.participants.length !== 2) {
        setIsChatConnected(false);
        console.log("chatIsConnected state change - 2", isChatConnected);
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

      const auth = socket.auth as {
        sessionId?: string;
        chatRoomId?: string;
        [key: string]: any;
      };

      const socketSessionId = auth?.sessionId ? auth?.sessionId : socket.id;
      const chatRoomId = auth?.chatRoomId ? auth?.chatRoomId : "";

      if (currChatRoom && socketSessionId) {
        socket.emit("leave-chat", currChatRoom?.id);
      } else if (socketSessionId && !currChatRoom && chatRoomId) {
        // if there's an existing user session, but the other person has left the chat
        socket.emit("leave-chat", chatRoomId);
      }

      // Reset necessary states
      setIsChatConnected(false);
      console.log("chatIsConnected state change - 3", isChatConnected);
      setStartChatSession(false);
      setChatMessages([]);
      setCurrChatRoom(null);

      auth.sessionId = "";
      auth.chatRoomId = "";
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
        setCurrChatRoom(chatRoom);
        setIsChatConnected(true);
        console.log("chatIsConnected state change - 4", isChatConnected);
      }
    }

    function onLeftChat(notification: string) {
      console.log(`Notification: ${notification}`);
      setIsChatConnected(false);
      console.log("chatIsConnected state change - 5", isChatConnected);
    }

    function startChat() {
      if (socket.connected && socket.id) {
        const eventId = uuidv4();
        socket.emit("start-chat", socket.id, eventId);
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
        flushSync(() => {
          setChatMessages(chatMessages);
        });
      }
    }

    function onMissedMessages(chatMessages: ChatMessage[]) {
      if (chatMessages.length >= 0) {
        flushSync(() => {
          setChatMessages((prev) => [...prev, ...chatMessages]);
        });
      }
    }

    function onInactiveChatRoom(chatRoom: ChatRoom) {
      // Remove session and reset states
      if (typeof window !== undefined) {
        window.localStorage.removeItem("chatSession");

        setIsChatConnected(false);
        console.log("chatIsConnected state change - 6", isChatConnected);
        setStartChatSession(false);
        setChatMessages([]);
        setCurrChatRoom(null);

        socket.auth = {
          sessionId: "",
          chatRoomId: "",
        };

        socket.disconnect();
      }
    }

    socket.on("connect", startChat);
    socket.on("session", onSession);
    socket.on("receive-message", onReceiveMessage);
    socket.on("chatRoom-connected", onChatConnected);
    socket.on("left-chat", onLeftChat);
    socket.on("connect_error", connectError);
    socket.on("chat-history", onChatHistory);
    socket.on("missed-messages", onMissedMessages);
    socket.on("inactive-chatRoom", onInactiveChatRoom);

    return () => {
      socket.off("connect", startChat);
      socket.off("receive-message", onReceiveMessage);
      socket.off("chatRoom-connected", onChatConnected);
      socket.off("left-chat", onLeftChat);
      socket.off("connect_error", connectError);
      socket.off("session", onSession);
      socket.off("chat-history", onChatHistory);
      socket.off("missed-messages", onMissedMessages);
      socket.off("inactive-chatRoom", onInactiveChatRoom);
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

      const socketSessionId = auth?.sessionId
        ? auth.sessionId
        : (socket.id as string);
      const chatRoomId = auth?.chatRoomId ? auth?.chatRoomId : "";

      const chatMessage: ChatMessage = {
        id: uuidv4(),
        sender: socketSessionId,
        message: newMessage,
        timestamp: new Date().toISOString(),
      };
      const eventId = uuidv4();

      socket.emit("send-message", chatRoomId, chatMessage, eventId);
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
