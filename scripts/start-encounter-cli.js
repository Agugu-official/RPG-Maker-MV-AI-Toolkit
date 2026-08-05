import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { createRPGMakerHttpBridge } from "../dist/rpgmaker/http-bridge.js";
import { RPGMakerDebugBridge } from "../dist/rpgmaker/debug-bridge.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv(path.join(workspaceRoot, ".env"));

const bridgePort = Number(process.env.RPGMAKER_BRIDGE_PORT || 9001);
const projectPath = process.env.RPGMAKER_PROJECT_PATH;
const executablePath = process.env.RPGMAKER_EXECUTABLE_PATH;
const timeout = 120000;

if (!projectPath) {
  console.error("ERROR: RPGMAKER_PROJECT_PATH is not set in .env or the environment.");
  process.exit(1);
}

if (!executablePath) {
  console.error("ERROR: RPGMAKER_EXECUTABLE_PATH is not set in .env or the environment.");
  process.exit(1);
}

function createTempTroop(enemyId, count) {
  const troopsPath = path.join(projectPath, "data", "Troops.json");
  const troops = JSON.parse(fs.readFileSync(troopsPath, "utf-8"));
  const ids = troops
    .filter((troop) => troop !== null && typeof troop.id === "number")
    .map((troop) => troop.id);
  const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;

  troops.push({
    id: newId,
    name: `Auto Troop (Enemy ${enemyId})`,
    members: Array.from({ length: count }, (_, index) => ({
      enemyId,
      x: 500 + index * 100,
      y: 400 + (index % 2) * 100,
      hidden: false,
    })),
    pages: [{
      conditions: {
        actorHp: 50, actorId: 1, actorValid: false,
        enemyHp: 50, enemyIndex: 0, enemyValid: false,
        switchId: 1, switchValid: false,
        turnA: 0, turnB: 0, turnEnding: false, turnValid: false,
      },
      list: [{ code: 0, indent: 0, parameters: [] }],
      span: 0,
    }],
  });

  fs.writeFileSync(troopsPath, JSON.stringify(troops, null, 2));
  return newId;
}

const debugBridge = new RPGMakerDebugBridge();
const server = createRPGMakerHttpBridge(debugBridge);

function listen(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(bridgePort, "127.0.0.1", () => {
      server.removeListener("error", reject);
      console.error(`[BRIDGE] HTTP bridge listening on port ${bridgePort}`);
      resolve();
    });
  });
}

function closeBridge(): Promise<void> {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

async function waitForGame() {
  console.error("[BRIDGE] Waiting for game to connect...");
  const start = Date.now();
  while (!debugBridge.connected && Date.now() - start < 30000) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!debugBridge.connected) throw new Error("Game did not connect within 30s");
  console.error("[BRIDGE] Game connected!");
}

async function main() {
  const troopId = parseInt(process.argv[2] || "", 10) || undefined;
  const enemyId = parseInt(process.argv[3] || "", 10) || undefined;
  const count = parseInt(process.argv[4] || "", 10) || 1;

  await listen();
  try {
    let resolvedTroopId = troopId;
    if (!resolvedTroopId && enemyId) {
      resolvedTroopId = createTempTroop(enemyId, count);
      console.error(`[TROOP] Created temp troop #${resolvedTroopId}`);
    }
    if (!resolvedTroopId) {
      resolvedTroopId = 1;
      console.error("[TROOP] Using troop #1");
    }

    console.error(`[LAUNCH] Starting game: ${executablePath}`);
    const child = spawn(executablePath, [projectPath], {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
      shell: false,
    });
    child.unref();
    console.error("[LAUNCH] Game launched, waiting for plugin to connect...");

    await waitForGame();
    console.error("[BRIDGE] Waiting for map scene to load...");
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Arm the waiter before publishing the command so a fast game response is not lost.
    const battlePromise = debugBridge.waitForBattle(timeout);
    debugBridge.setCommand("start_battle", { troopId: resolvedTroopId });
    console.error(`[BATTLE] Command sent: start_battle troop=${resolvedTroopId}`);
    const result = await battlePromise;

    console.log(JSON.stringify({
      success: result.success,
      battle_log: result.log,
      final_state: result.state,
      error: result.success ? undefined : result.summary,
    }));
  } finally {
    await closeBridge();
  }
}

main().catch(async (error) => {
  await closeBridge();
  console.error(`[FATAL] ${error.message}`);
  process.exitCode = 1;
});
