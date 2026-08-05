import type { HandlerContext } from "./types.js";
import { xhrPostGameStateStatement } from "../rpgmaker/runtime-script.js";

function notConnected(): string {
  return JSON.stringify({ error: "Game not connected. Start the game with the RPGMakerDebugger plugin enabled." });
}

export async function handleManagePartyRuntime(ctx: HandlerContext): Promise<string> {
  const { input, debugBridge, changeLog } = ctx;
  if (!debugBridge.connected) return notConnected();

  const action = input.action as "add" | "remove" | "get";
  const actorId = input.actor_id as number | undefined;

  if ((action === "add" || action === "remove") && !actorId) {
    return JSON.stringify({ error: "actor_id is required for add/remove actions" });
  }

  try {
    if (action === "get") {
      const script = `(function(){
        var members = $gameParty.allMembers().map(function(m) {
          return { id: m.actorId(), name: m.name(), hp: m.hp, maxHp: m.mhp, level: m.level };
        });
        ${xhrPostGameStateStatement(`({
            mapId: $gameMap ? $gameMap.mapId() : 0,
            playerX: $gamePlayer ? $gamePlayer.x : 0,
            playerY: $gamePlayer ? $gamePlayer.y : 0,
            switches: {},
            variables: {},
            queryResult: members
          })`)}
      })();`;

      const state = await debugBridge.sendAndWaitForGameState("execute_script", { code: script }, 8000);
      const qr = (state as unknown as Record<string, unknown>).queryResult;
      return JSON.stringify({ success: true, party: qr });
    }

    if (action === "add") {
      const code = `$gameParty.addActor(${actorId});`;
      const ok = await debugBridge.sendAndWaitForAck("execute_script", { code }, 5000);
      if (!ok) return JSON.stringify({ error: "Timed out waiting for game confirmation" });
      changeLog.append({ tool: "manage-party-runtime", entityType: "Actor", entityId: actorId, action: "update", summary: `Actor ${actorId} added to party at runtime` });
      return JSON.stringify({ success: true, action: "add", actor_id: actorId });
    }

    if (action === "remove") {
      const code = `$gameParty.removeActor(${actorId});`;
      const ok = await debugBridge.sendAndWaitForAck("execute_script", { code }, 5000);
      if (!ok) return JSON.stringify({ error: "Timed out waiting for game confirmation" });
      changeLog.append({ tool: "manage-party-runtime", entityType: "Actor", entityId: actorId, action: "update", summary: `Actor ${actorId} removed from party at runtime` });
      return JSON.stringify({ success: true, action: "remove", actor_id: actorId });
    }

    return JSON.stringify({ error: `Unknown action: ${String(action)}` });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}
