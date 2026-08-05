import type { HandlerContext } from "./types.js";
import { xhrPostGameStateStatement } from "../rpgmaker/runtime-script.js";

function notConnected(): string {
  return JSON.stringify({ error: "Game not connected. Start the game with the RPGMakerDebugger plugin enabled." });
}

export async function handleGetActorRuntime(ctx: HandlerContext): Promise<string> {
  const { input, debugBridge } = ctx;
  if (!debugBridge.connected) return notConnected();

  const actorId = input.actor_id as number;
  if (!actorId) return JSON.stringify({ error: "actor_id is required" });

  const script = `(function(){
    var actor = $gameActors.actor(${actorId});
    var result = null;
    if (actor) {
      result = {
        id: actor.actorId(),
        name: actor.name(),
        level: actor.level,
        hp: actor.hp,
        maxHp: actor.mhp,
        mp: actor.mp,
        maxMp: actor.mmp,
        tp: actor.tp,
        exp: actor._exp[actor._classId] || 0,
        states: actor._states,
        buffs: actor._buffs,
        isAlive: actor.isAlive()
      };
    }
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
    if (qr === null) {
      return JSON.stringify({ error: `Actor ${actorId} not found in game` });
    }
    return JSON.stringify({ success: true, actor: qr });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}
