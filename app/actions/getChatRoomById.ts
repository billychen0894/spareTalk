"use server";

import { ChatRoom } from "@page";

export async function getChatRoomById(
  chatRoomId: string
): Promise<ChatRoom | null> {
  const response = await fetch(
    `${process.env.API_BASE_URL}/chats/${chatRoomId}`
  );

  const { data } = (await response.json()) as {
    data: {
      id: string;
      state: "idle" | "occupied";
      participants: string[];
    };
  };

  return data;
}
