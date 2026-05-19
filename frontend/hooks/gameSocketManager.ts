import { io, Socket } from "socket.io-client";

// Lightweight singleton Socket.IO manager to survive HMR and share one socket across hooks/components
export type MessageHandler = (message: Record<string, unknown>) => void;

interface GameMessage {
  type: string;
  data?: unknown;
  reason?: string;
  error?: string;
  message?: string;
}

class GameSocketManager {
  private socket: Socket | null = null;
  private url: string = "";
  private subscribers = new Set<MessageHandler>();
  private isManuallyDisconnected = false;
  private isConnecting = false;

  connect(url: string) {
    this.url = url;
    this.isManuallyDisconnected = false;

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) return;

    // If already connected to the same URL, don't reconnect
    if (this.socket && this.socket.connected && this.url === url) return;

    this.isConnecting = true;

    // Clean up existing socket if URL changed or socket exists but not connected
    if (this.socket) {
      this.socket.removeAllListeners();
      if (!this.socket.connected) {
        this.socket.disconnect();
      }
    }

    this.socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on("connect", () => {
      this.isConnecting = false;
      this.broadcast({ type: "_OPEN" });
    });

    this.socket.on("disconnect", (reason: string) => {
      this.isConnecting = false;
      // Only broadcast disconnect if not manually disconnected
      if (!this.isManuallyDisconnected) {
        this.broadcast({ type: "_CLOSE", reason });
      }
    });

    this.socket.on("connect_error", (err: Error & { message?: string }) => {
      this.isConnecting = false;
      this.broadcast({ type: "_ERROR", error: err.message || String(err) });
    });

    // Proxy common game events
    this.socket.on("GAME_STATE_UPDATE", (data: unknown) =>
      this.broadcast({ type: "GAME_STATE_UPDATE", data })
    );
    this.socket.on("HISTORY_UPDATE", (data: unknown) =>
      this.broadcast({ type: "HISTORY_UPDATE", data })
    );
    this.socket.on("LEADERBOARD_UPDATE", (data: unknown) =>
      this.broadcast({ type: "LEADERBOARD_UPDATE", data })
    );
    this.socket.on("BET_PLACED", (data: unknown) =>
      this.broadcast({ type: "BET_PLACED", data })
    );
    this.socket.on("CASH_OUT_SUCCESS", (data: unknown) =>
      this.broadcast({ type: "CASH_OUT_SUCCESS", data })
    );
    this.socket.on("ERROR", (data: Record<string, unknown> | undefined) =>
      this.broadcast({ type: "ERROR", message: data?.message })
    );
  }

  send(message: GameMessage) {
    if (!this.socket) {
      this.connect(
        this.url || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
      );
    }
    if (this.socket && this.socket.connected) {
      const { type, data } = message;
      this.socket.emit(type, data);
    } else {
      console.warn("Socket not connected, message dropped", message);
    }
  }

  subscribe(handler: MessageHandler) {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  private broadcast(message: Record<string, unknown>) {
    this.subscribers.forEach((s) => s(message));
  }

  disconnect() {
    this.isManuallyDisconnected = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const globalRef = globalThis as Record<string, unknown>;
if (!globalRef.__GAME_SOCKET_MANAGER__) {
  globalRef.__GAME_SOCKET_MANAGER__ = new GameSocketManager();
}

export default globalRef.__GAME_SOCKET_MANAGER__ as GameSocketManager;
