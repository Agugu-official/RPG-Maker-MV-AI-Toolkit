import { describe, it, expect } from "vitest";
import * as fs from "fs";
import { RPGMakerReader } from "../../src/rpgmaker/reader.js";
import { RPGMakerWriter } from "../../src/rpgmaker/writer.js";

const referencePath = process.env.RPGMAKER_MV_REFERENCE_PATH
  ?? "E:\\Apps\\Workbench\\Projects\\TS-Magical-Girl-Moonwalker";
const hasReference = fs.existsSync(pathFor(referencePath, "js", "rpg_core.js"))
  && fs.existsSync(pathFor(referencePath, "js", "rpg_managers.js"));

function pathFor(root: string, ...parts: string[]): string {
  return [root, ...parts].join("\\");
}

describe("real RPG Maker MV reference project (read-only)", () => {
  it.skipIf(!hasReference)("detects MV and reads representative legacy data", () => {
    const reader = new RPGMakerReader({ projectPath: referencePath });
    expect(reader.engine).toBe("mv");

    const system = reader.readProjectConfig();
    expect(system).not.toHaveProperty("optAutosave");

    const animations = reader.readAnimations() as Array<Record<string, unknown>>;
    const animation = animations.find(Boolean);
    expect(animation).toMatchObject({
      animation1Name: expect.any(String),
      animation2Name: expect.any(String),
      frames: expect.any(Array),
      position: expect.any(Number),
      timings: expect.any(Array),
    });

    const map = reader.readMap(1) as unknown as Record<string, unknown>;
    expect(map.width).toBe(30);
    expect(map.height).toBe(25);
    expect((map.data as unknown[]).length).toBe(30 * 25 * 6);

    const plugins = reader.getPluginFiles();
    expect(plugins.length).toBeGreaterThan(0);
    const registeredPlugins = new RPGMakerWriter({ projectPath: referencePath, engine: "mv", createBackup: false }).listPlugins();
    expect(registeredPlugins.length).toBeGreaterThan(0);
    expect(reader.readPlugin("CPWH_LotteryCore.js")).toContain("pluginCommand");
    const mvCommands = reader.readCommonEvents().flatMap((event) => {
      const list = event.list;
      return Array.isArray(list) ? list : [];
    });
    expect(mvCommands.some((command) => {
      const item = command as { code?: number; parameters?: unknown[] };
      return item.code === 356 && typeof item.parameters?.[0] === "string";
    })).toBe(true);
    expect(mvCommands).toContainEqual(expect.objectContaining({
      code: 356,
      parameters: ["LotteryPool add 1"],
    }));
    expect(mvCommands).toContainEqual(expect.objectContaining({
      code: 356,
      parameters: ["Pickboard Start 4 7 7"],
    }));
  });
});
