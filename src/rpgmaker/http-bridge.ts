import * as http from "http";
import { RPGMakerDebugBridge, type BattleLogEntry, type BattleState, type GameState } from "./debug-bridge.js";

/**
 * Create the HTTP bridge used by the generated MV/MZ debug plugin.
 *
 * Keeping this server separate from the MCP bootstrap also lets the standalone
 * bridge script use the exact same protocol as the MCP process.
 */
export function createRPGMakerHttpBridge(
  debugBridge: RPGMakerDebugBridge,
): http.Server {
  return http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || "/";

    if (req.method === "GET" && url === "/ping") {
      debugBridge.markConnected();
      const command = debugBridge.getCommand();
      if (command) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(command));
      } else {
        res.writeHead(204);
        res.end();
      }
      return;
    }

    if (req.method === "POST" && (url === "/log" || url === "/state" || url === "/gamestate" || url === "/ack")) {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const data = JSON.parse(body) as Record<string, unknown>;
          if (url === "/log") {
            debugBridge.addEvent(data as unknown as BattleLogEntry);
          } else if (url === "/state") {
            const state = data as unknown as BattleState;
            if (!state.inBattle || state.battleOver) debugBridge.setFinalState(state);
          } else if (url === "/gamestate") {
            debugBridge.setGameState(data as unknown as GameState);
          } else {
            debugBridge.resolveAck();
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok" }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON payload" }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });
}
