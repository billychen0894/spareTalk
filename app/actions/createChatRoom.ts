"use server";

export async function createChatRoom() {
  const response = await fetch(
    `${process.env.API_BASE_URL}/chats/create-room`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );

  const { chatRoomId } = (await response.json()) as { chatRoomId: string };

  return chatRoomId;
}
