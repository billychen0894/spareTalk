"use client";

import Menu from "@components/navigation/Menu";
import { Button } from "@components/ui/button";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/20/solid";

export default function Home() {
  return (
    <main className="text-white max-w-7xl mx-auto h-screen px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      <Menu />
      <div className="mx-auto max-w-3xl flex flex-col justify-center items-center space-y-16">
        <div className="drop-shadow-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          <ChatBubbleOvalLeftEllipsisIcon className="text-white h-12 w-12 mx-auto" />
          <h1 className="text-5xl md:text-8xl font-bold ">SpareTalk</h1>
        </div>
        <Button
          className="bg-white bg-opacity-20 backdrop-blur-lg shadow-lg hover:bg-transparent font-semibold text-2xl py-8 px-6"
          onClick={() => console.log("start chat")}
        >
          Start Chat
        </Button>

        {/* <div className="bg-white bg-opacity-20 backdrop-blur-lg p-8 rounded-lg shadow-lg"> */}
        {/* </div> */}
      </div>
    </main>
  );
}
