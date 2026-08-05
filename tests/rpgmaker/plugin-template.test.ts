import { describe, expect, it } from "vitest";
import { PluginTemplates } from "../../src/templates/plugin-template.js";

describe("MV/MZ plugin templates", () => {
  it("generates MV command hooks and parses as JavaScript", () => {
    const code = PluginTemplates.withParameters("LotteryPool", "test", "AI", "1.0.0", [], "mv");
    expect(code).toContain("@target MV");
    expect(code).toContain("Game_Interpreter.prototype.pluginCommand");
    expect(code).not.toContain("PluginManager.registerCommand");
    expect(() => new Function(code)).not.toThrow();
  });

  it("generates MZ command registration and parses as JavaScript", () => {
    const code = PluginTemplates.withParameters("VisuMZ_Core", "test", "AI", "1.0.0", [], "mz");
    expect(code).toContain("@target MZ");
    expect(code).toContain("PluginManager.registerCommand");
    expect(code).not.toContain("Game_Interpreter.prototype.pluginCommand");
    expect(() => new Function(code)).not.toThrow();
  });

  it("dispatches the generated MV and MZ command registrations", () => {
    const globals = globalThis as unknown as Record<string, unknown>;
    const previousInterpreter = globals.Game_Interpreter;
    const previousPluginManager = globals.PluginManager;
    try {
      const mvCalls: unknown[][] = [];
      class MVInterpreter {
        pluginCommand(command: string, args: string[]) {
          mvCalls.push([command, args]);
        }
      }
      globals.Game_Interpreter = MVInterpreter;
      globals.PluginManager = { parameters: () => ({}) };
      new Function(PluginTemplates.withParameters("LotteryPool", "test", "AI", "1.0.0", [], "mv"))();
      new MVInterpreter().pluginCommand("LotteryPool", ["exampleCommand", "1"]);
      expect(mvCalls).toEqual([["LotteryPool", ["exampleCommand", "1"]]]);

      let registration: { plugin: string; command: string; handler: (args: Record<string, string>) => void } | undefined;
      globals.PluginManager = {
        parameters: () => ({}),
        registerCommand: (plugin: string, command: string, handler: (args: Record<string, string>) => void) => {
          registration = { plugin, command, handler };
        },
      };
      new Function(PluginTemplates.withParameters("VisuMZ_Core", "test", "AI", "1.0.0", [], "mz"))();
      expect(registration?.plugin).toBe("VisuMZ_Core");
      expect(registration?.command).toBe("exampleCommand");
      expect(() => registration?.handler({ Value: "1" })).not.toThrow();
    } finally {
      if (previousInterpreter === undefined) delete globals.Game_Interpreter;
      else globals.Game_Interpreter = previousInterpreter;
      if (previousPluginManager === undefined) delete globals.PluginManager;
      else globals.PluginManager = previousPluginManager;
    }
  });

  it("uses XHR and handles both synchronous and Promise save/load results", () => {
    const mv = PluginTemplates.debugBridge(9001, "mv");
    const mz = PluginTemplates.debugBridge(9001, "mz");
    for (const code of [mv, mz]) {
      expect(code).toContain("XMLHttpRequest");
      expect(code).not.toContain("fetch(");
      expect(code).toContain("value === false");
      expect(() => new Function(code)).not.toThrow();
    }
  });
});
