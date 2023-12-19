import { Socket, io } from "socket.io-client";

export class SocketClient {
  private static instance: SocketClient;
  private socket: Socket;

  constructor() {
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      autoConnect: false,
    });
  }

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }

    return SocketClient.instance;
  }

  public getSocket(): Socket {
    return this.socket;
  }
}
