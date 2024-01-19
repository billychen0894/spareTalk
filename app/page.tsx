"use client";

import ChatAction from "@components/chats/ChatAction";
import ChatInput from "@components/chats/ChatInput";
import ChatMessages from "@components/chats/ChatMessages";
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

export type SocketAuth = {
  sessionId?: string;
  chatRoomId?: string;
  [key: string]: any;
};

export default function Home() {
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [startChatSession, setStartChatSession] = useState<boolean>(false);
  const [currChatRoom, setCurrChatRoom] = useState<ChatRoom | null>(null);
  const chatContainerRef = useRef<HTMLQuoteElement | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const socket = SocketClient.getInstance().getSocket();
  const [sessionId, setSessionId] = useState<string>("");
  const [chatRoomId, setChatRoomId] = useState<string>("");

  useEffect(() => {
    // Recover session if exists
    if (typeof window !== undefined) {
      const chatSessionObj = window.localStorage.getItem("chatSession");

      if (chatSessionObj) {
        const { sessionId, chatRoomId } = JSON.parse(chatSessionObj) as {
          sessionId: string;
          chatRoomId: string;
        };

        if (sessionId && !chatRoomId && !startChatSession) {
          window.localStorage.removeItem("chatSession");
          socket.auth = {
            sessionId: "",
            chatRoomId: "",
          };
          setSessionId("");
          setChatRoomId("");
        }

        if (sessionId && chatRoomId) {
          socket.auth = {
            sessionId,
            chatRoomId,
          };
          socket.connect();
          setSessionId(sessionId);
          setChatRoomId(chatRoomId);
        }
      }
    }
  }, [socket, startChatSession]);

  function startChatConnection() {
    socket.connect();
    setStartChatSession(true);
  }

  function disconnectChat() {
    if (socket.connected && typeof window !== undefined) {
      socket.emit("leave-chat", currChatRoom?.id);

      window.localStorage.removeItem("chatSession");
      const auth = socket.auth as SocketAuth;

      setStartChatSession(false);
      setChatMessages([]);
      setCurrChatRoom(null);
      setSessionId("");
      setChatRoomId("");

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

    function onChatRoomCreated(chatRoom: ChatRoom) {
      if (socket.connected && chatRoom) {
        setCurrChatRoom(chatRoom);
      }
    }

    function onLeftChat(userId: string) {
      if (currChatRoom) {
        setCurrChatRoom({
          id: currChatRoom.id,
          state: "idle",
          participants: currChatRoom.participants.filter((id) => id !== userId),
        });
      }
    }

    function startChat() {
      if (socket.connected) {
        const eventId = uuidv4();

        if (sessionId && chatRoomId) {
          socket.emit("check-chatRoom-session", chatRoomId, sessionId, eventId);
        }

        if (!chatRoomId) {
          socket.emit("start-chat", socket.id, eventId);
        }
      }
    }

    function connectError(err: any) {
      if (err) {
        setIsError(true);
        console.error(err.message);
      }
    }

    function onSession(session: { sessionId: string; chatRoomId: string }) {
      if (socket.connected && typeof window !== undefined) {
        // set session obj to auth object
        socket.auth = {
          sessionId: session.sessionId,
          chatRoomId: session.chatRoomId,
        };
        setSessionId(session?.sessionId);
        setChatRoomId(session?.chatRoomId);

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

        setStartChatSession(false);
        setChatMessages([]);
        setCurrChatRoom(null);
        setSessionId("");
        setChatRoomId("");

        socket.auth = {
          sessionId: "",
          chatRoomId: "",
        };

        socket.disconnect();
      }
    }

    function onReceiveChatRoomSession(chatRoom: ChatRoom | null) {
      if (socket.connected && chatRoom) {
        const eventId = uuidv4();
        socket.emit("start-chat", socket.id, eventId);
        socket.emit("retrieve-chat-messages", chatRoom?.id, eventId);

        setStartChatSession(true);
        setCurrChatRoom(chatRoom);
      }
      if (socket.connected && !chatRoom && typeof window !== undefined) {
        window.localStorage.removeItem("chatSession");

        setStartChatSession(false);
        setChatMessages([]);
        setCurrChatRoom(null);
        setSessionId("");
        setChatRoomId("");

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
    socket.on("chatRoom-created", onChatRoomCreated);
    socket.on("left-chat", onLeftChat);
    socket.on("connect_error", connectError);
    socket.on("chat-history", onChatHistory);
    socket.on("missed-messages", onMissedMessages);
    socket.on("inactive-chatRoom", onInactiveChatRoom);
    socket.on("receive-chatRoom-session", onReceiveChatRoomSession);

    return () => {
      socket.off("connect", startChat);
      socket.off("receive-message", onReceiveMessage);
      socket.off("chatRoom-created", onChatRoomCreated);
      socket.off("left-chat", onLeftChat);
      socket.off("connect_error", connectError);
      socket.off("session", onSession);
      socket.off("chat-history", onChatHistory);
      socket.off("missed-messages", onMissedMessages);
      socket.off("inactive-chatRoom", onInactiveChatRoom);
      socket.off("receive-chatRoom-session", onReceiveChatRoomSession);
    };
  }, [socket, chatRoomId, sessionId, currChatRoom]);

  const handleSendMessage = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && currChatRoom && newMessage.trim()) {
      event.preventDefault();

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
        <ChatAction
          startChatSession={startChatSession}
          handleChatConnection={startChatConnection}
        />
        <ChatMessages
          startChatSession={startChatSession}
          currChatRoom={currChatRoom}
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
        currChatRoom={currChatRoom}
        setNewMessage={setNewMessage}
        newMessage={newMessage}
        socket={socket}
      />
    </>
  );
}
