import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { commandInputToEventCommands } from "../../src/rpgmaker/commands.js";
import { detectProjectEngine } from "../../src/rpgmaker/engine.js";
import { RPGMakerDebugBridge } from "../../src/rpgmaker/debug-bridge.js";
import { ChangeLog } from "../../src/rpgmaker/change-log.js";
import { RPGMakerReader } from "../../src/rpgmaker/reader.js";
import { RPGMakerWriter } from "../../src/rpgmaker/writer.js";
import { handleCreateAnimation } from "../../src/handlers/create-animation.js";
import { handleEditAnimation, handleReadAnimation } from "../../src/handlers/animation.js";
import type { HandlerContext } from "../../src/handlers/types.js";

const tempProjects: string[] = [];

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function createProject(engine: "mv" | "mz"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rpgmaker-mv-compat-"));
  tempProjects.push(dir);
  fs.mkdirSync(path.join(dir, "data"), { recursive: true });
  writeJson(path.join(dir, "data", "Animations.json"), [null]);
  if (engine === "mv") {
    fs.mkdirSync(path.join(dir, "js"), { recursive: true });
    fs.writeFileSync(path.join(dir, "js", "rpg_core.js"), "// MV fixture");
    fs.writeFileSync(path.join(dir, "js", "rpg_managers.js"), "// MV fixture");
  } else {
    fs.mkdirSync(path.join(dir, "js"), { recursive: true });
    fs.writeFileSync(path.join(dir, "js", "rmmz_core.js"), "// MZ fixture");
    fs.writeFileSync(path.join(dir, "js", "rmmz_managers.js"), "// MZ fixture");
  }
  return dir;
}

function context(dir: string, engine: "mv" | "mz", input: Record<string, unknown>): HandlerContext {
  return {
    reader: new RPGMakerReader({ projectPath: dir, engine }),
    writer: new RPGMakerWriter({ projectPath: dir, engine, createBackup: true }),
    profile: detectProjectEngine(dir, engine),
    input,
    projectPath: dir,
    debugBridge: new RPGMakerDebugBridge(),
    changeLog: new ChangeLog(dir),
    debug: false,
  };
}

function backupFiles(dir: string): string[] {
  const backupDir = path.join(dir, "backups");
  return fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
}

afterEach(() => {
  for (const dir of tempProjects.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("MV/MZ plugin-command event data", () => {
  it("writes MV raw_command as code 356 without rewriting it", () => {
    const raw = String.raw`Pickboard Start 4 7 7 \path\with spaces`;
    const commands = commandInputToEventCommands({ type: "plugin-command", data: { raw_command: raw } }, "mv");
    expect(commands).toEqual([{ code: 356, indent: 0, parameters: [raw] }]);
  });

  it("writes structured MV tokens without separately prepending plugin_name", () => {
    const commands = commandInputToEventCommands({
      type: "plugin-command",
      data: { plugin_name: "LotteryPool", command_name: "LotteryPool", mv_args: ["add", "1"] },
    }, "mv");
    expect(commands[0].code).toBe(356);
    expect(commands[0].parameters[0]).toBe("LotteryPool add 1");
  });

  it("rejects ambiguous MV raw and structured inputs", () => {
    expect(() => commandInputToEventCommands({
      type: "plugin-command",
      data: { raw_command: "LotteryPool add 1", command_name: "add", mv_args: ["1"] },
    }, "mv")).toThrow(/cannot be combined/);
  });

  it("keeps the MZ object layout on code 357", () => {
    const commands = commandInputToEventCommands({
      type: "plugin-command",
      data: { plugin_name: "VisuMZ_Core", command_name: "DoThing", args: { Value: "1" } },
    }, "mz");
    expect(commands).toEqual([{ code: 357, indent: 0, parameters: ["VisuMZ_Core", "DoThing", { Value: "1" }] }]);
  });
});

describe("native animation format handlers", () => {
  it("creates and reads a legal MV animation with a blank frame", async () => {
    const dir = createProject("mv");
    const created = JSON.parse(await handleCreateAnimation(context(dir, "mv", {
      name: "MV Burst",
      animation1_name: "",
      animation2_name: "",
    })));
    expect(created.success).toBe(true);

    const animations = JSON.parse(fs.readFileSync(path.join(dir, "data", "Animations.json"), "utf-8"));
    expect(animations[1]).toMatchObject({
      name: "MV Burst",
      animation1Name: "",
      animation2Name: "",
      frames: [[]],
      position: 0,
      timings: [],
    });
    expect(backupFiles(dir)).toHaveLength(1);

    const read = JSON.parse(await handleReadAnimation(context(dir, "mv", { animation_id: created.animation_id })));
    expect(read.animation.frames).toEqual([[]]);
  });

  it("rejects MZ animation fields on MV before backup and change log", async () => {
    const dir = createProject("mv");
    const result = JSON.parse(await handleCreateAnimation(context(dir, "mv", {
      name: "Wrong Format",
      effect_name: "Fire_01",
    })));
    expect(result.error).toContain("other animation format");
    expect(backupFiles(dir)).toHaveLength(0);
    expect(fs.existsSync(path.join(dir, "mcp-changes.json"))).toBe(false);
  });

  it("rejects MV animation fields on MZ before writing", async () => {
    const dir = createProject("mz");
    writeJson(path.join(dir, "data", "Animations.json"), [null, {
      id: 1,
      name: "MZ Effect",
      effectName: "Fire_01",
      displayType: 0,
      offsetX: 0,
      offsetY: 0,
      speed: 100,
      flashTimings: [],
      soundTimings: [],
    }]);
    const result = JSON.parse(await handleEditAnimation(context(dir, "mz", {
      animation_id: 1,
      frames: [[]],
    })));
    expect(result.error).toContain("do not support MV fields");
    expect(backupFiles(dir)).toHaveLength(0);
  });
});
