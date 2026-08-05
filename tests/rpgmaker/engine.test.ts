import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { detectProjectEngine } from "../../src/rpgmaker/engine.js";
import { RPGMakerReader } from "../../src/rpgmaker/reader.js";
import { RPGMakerWriter } from "../../src/rpgmaker/writer.js";

const tempProjects: string[] = [];

function project(markers: "mv" | "mz" | "none" | "both"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rpgmaker-engine-"));
  tempProjects.push(dir);
  fs.mkdirSync(path.join(dir, "data"), { recursive: true });
  if (markers === "mv" || markers === "both") {
    fs.mkdirSync(path.join(dir, "js"), { recursive: true });
    fs.writeFileSync(path.join(dir, "js", "rpg_core.js"), "// MV fixture");
    fs.writeFileSync(path.join(dir, "js", "rpg_managers.js"), "// MV fixture");
  }
  if (markers === "mz" || markers === "both") {
    fs.mkdirSync(path.join(dir, "js"), { recursive: true });
    fs.writeFileSync(path.join(dir, "js", "rmmz_core.js"), "// MZ fixture");
    fs.writeFileSync(path.join(dir, "js", "rmmz_managers.js"), "// MZ fixture");
  }
  return dir;
}

afterEach(() => {
  for (const dir of tempProjects.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("RPG Maker engine detection", () => {
  it("detects MV and MZ from their runtime marker pairs", () => {
    expect(detectProjectEngine(project("mv"), "auto").engine).toBe("mv");
    expect(detectProjectEngine(project("mz"), "auto").engine).toBe("mz");
    expect(detectProjectEngine(project("mv"), "auto").capabilities.supportsMvPluginCommandHook).toBe(true);
    expect(detectProjectEngine(project("mz"), "auto").capabilities.supportsMzCommandRegistration).toBe(true);
  });

  it("rejects missing and conflicting automatic markers", () => {
    expect(() => detectProjectEngine(project("none"), "auto")).toThrow(/Unable to detect/);
    expect(() => detectProjectEngine(project("both"), "auto")).toThrow(/both MV and MZ/);
  });

  it("allows an explicit override for stripped fixtures", () => {
    const dir = project("none");
    const profile = detectProjectEngine(dir, "mv");
    expect(profile.engine).toBe("mv");
    expect(profile.source).toBe("override");
    expect(new RPGMakerReader({ projectPath: dir, engine: "mv" }).engine).toBe("mv");
    expect(new RPGMakerWriter({ projectPath: dir, engine: "mv", createBackup: false }).engine).toBe("mv");
  });

  it("honors RPGMAKER_ENGINE when no per-call override is supplied", () => {
    const dir = project("mz");
    const previous = process.env.RPGMAKER_ENGINE;
    process.env.RPGMAKER_ENGINE = "mv";
    try {
      const profile = detectProjectEngine(dir);
      expect(profile.engine).toBe("mv");
      expect(profile.source).toBe("override");
    } finally {
      if (previous === undefined) delete process.env.RPGMAKER_ENGINE;
      else process.env.RPGMAKER_ENGINE = previous;
    }
  });
});
