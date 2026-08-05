import type { HandlerContext } from "./types.js";
import { xhrPostGameStateStatement } from "../rpgmaker/runtime-script.js";

function notConnected(): string {
  return JSON.stringify({ error: "Game not connected. Start the game with the RPGMakerDebugger plugin enabled." });
}

export async function handleGetMapStateRuntime(ctx: HandlerContext): Promise<string> {
  const { debugBridge } = ctx;
  if (!debugBridge.connected) return notConnected();

  const script = `(function(){
    var result = {
      mapId: $gameMap.mapId(),
      mapName: $gameMap.displayName(),
      width: $gameMap.width(),
      height: $gameMap.height(),
      playerX: $gamePlayer.x,
      playerY: $gamePlayer.y,
      playerDirection: $gamePlayer.direction(),
      eventCount: $gameMap.events().length,
      weather: $gameScreen._weather,
      parallaxName: $gameMap._parallaxName
    };
    ${xhrPostGameStateStatement(`({
        mapId: $gameMap ? $gameMap.mapId() : 0,
        playerX: $gamePlayer ? $gamePlayer.x : 0,
        playerY: $gamePlayer ? $gamePlayer.y : 0,
        switches: {},
        variables: {},
        queryResult: result
      })`)}
  })();`;

  try {
    const state = await ctx.debugBridge.sendAndWaitForGameState("execute_script", { code: script }, 8000);
    const qr = (state as unknown as Record<string, unknown>).queryResult;
    return JSON.stringify({ success: true, map_state: qr });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}
