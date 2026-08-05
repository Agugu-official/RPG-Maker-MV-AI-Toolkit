import { createRPGMakerHttpBridge } from "../dist/rpgmaker/http-bridge.js";
import { RPGMakerDebugBridge } from "../dist/rpgmaker/debug-bridge.js";

const port = Number(process.env.RPGMAKER_BRIDGE_PORT || 9001);
const debugBridge = new RPGMakerDebugBridge();
const server = createRPGMakerHttpBridge(debugBridge);

server.listen(port, "127.0.0.1", () => {
  console.log(`RPG Maker MV/MZ HTTP bridge running on port ${port}`);
  console.log("Waiting for the generated debug plugin to connect...");
});

const statusTimer = setInterval(() => {
  console.log(debugBridge.connected ? "Game connected" : "Waiting for game connection");
}, 2000);

function shutdown() {
  clearInterval(statusTimer);
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
