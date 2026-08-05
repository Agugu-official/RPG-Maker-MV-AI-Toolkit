import * as http from "http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRPGMakerHttpBridge, listenRPGMakerHttpBridge } from "../../src/rpgmaker/http-bridge.js";
import { RPGMakerDebugBridge, type GameState } from "../../src/rpgmaker/debug-bridge.js";

describe("RPG Maker HTTP bridge", () => {
  let bridge: RPGMakerDebugBridge;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    bridge = new RPGMakerDebugBridge();
    server = createRPGMakerHttpBridge(bridge);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function request(method: string, route: string, body = ""): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: "127.0.0.1", port, method, path: route, headers: { "Content-Type": "application/json" } }, (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { responseBody += chunk; });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: responseBody }));
      });
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
  }

  it("serves pending commands and marks the game connected", async () => {
    bridge.setCommand("get_state", {});
    const response = await request("GET", "/ping");
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ command: "get_state", args: {} });
    expect(bridge.connected).toBe(true);
  });

  it("resolves ACK waiters through the shared endpoint", async () => {
    bridge.setCommand("set_switch", { id: 1, value: true });
    const pending = bridge.waitForAck(1000);
    const response = await request("POST", "/ack", "{}");
    expect(response.status).toBe(200);
    expect(await pending).toBe(true);
    expect(bridge.getCommand()).toBeNull();
  });

  it("delivers query results through /gamestate", async () => {
    bridge.setCommand("execute_script", { code: "query" });
    const pending = bridge.waitForGameState(1000);
    const state: GameState & { queryResult?: unknown } = {
      mapId: 2,
      playerX: 3,
      playerY: 4,
      gold: 5,
      partyMembers: [],
      inBattle: false,
      timestamp: new Date().toISOString(),
      queryResult: { value: true },
    };
    const response = await request("POST", "/gamestate", JSON.stringify(state));
    expect(response.status).toBe(200);
    await expect(pending).resolves.toMatchObject({ mapId: 2, queryResult: { value: true } });
    expect(bridge.getCommand()).toBeNull();
  });

  it("handles an occupied port without an unhandled server error", async () => {
    const blocker = http.createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", () => resolve());
    });

    const occupiedPort = (blocker.address() as { port: number }).port;
    const conflictedBridge = createRPGMakerHttpBridge(new RPGMakerDebugBridge());
    let reportedCode: string | undefined;

    await expect(
      listenRPGMakerHttpBridge(conflictedBridge, occupiedPort, "127.0.0.1", (error) => {
        reportedCode = error.code;
      }),
    ).resolves.toBe(false);

    expect(reportedCode).toBe("EADDRINUSE");

    await new Promise<void>((resolve, reject) => {
      blocker.close((error) => error ? reject(error) : resolve());
    });
  });
});
