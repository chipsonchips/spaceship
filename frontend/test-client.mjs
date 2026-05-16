import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("Connected to server!");
});

socket.on("GAME_STATE_UPDATE", (data) => {
  console.log("GAME_STATE_UPDATE", data?.phase, data?.roundId, "countdown:", data?.flyStartTime);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server.");
});
