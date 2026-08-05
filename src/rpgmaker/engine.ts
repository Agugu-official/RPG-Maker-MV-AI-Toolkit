import * as fs from "fs";
import * as path from "path";

/** RPG Maker engine families supported by the data and runtime adapters. */
export type RPGMakerEngine = "mv" | "mz";

export type RPGMakerEngineOverride = RPGMakerEngine | "auto";

export interface RPGMakerEngineCapabilities {
  animationFormat: RPGMakerEngine;
  pluginCommandFormat: RPGMakerEngine;
  supportsEffekseer: boolean;
  supportsAutosave: boolean;
  supportsFollowerDistance: boolean;
  supportsMvPluginCommandHook: boolean;
  supportsMzCommandRegistration: boolean;
}

export interface RPGMakerProjectProfile {
  engine: RPGMakerEngine;
  source: "detected" | "override";
  markerFiles: string[];
  capabilities: RPGMakerEngineCapabilities;
}

const ENGINE_MARKERS: Record<RPGMakerEngine, readonly string[]> = {
  mv: ["js/rpg_core.js", "js/rpg_managers.js"],
  mz: ["js/rmmz_core.js", "js/rmmz_managers.js"],
};

function hasAllMarkers(projectPath: string, engine: RPGMakerEngine): boolean {
  return ENGINE_MARKERS[engine].every((marker) =>
    fs.existsSync(path.join(projectPath, ...marker.split("/")))
  );
}

function capabilitiesFor(engine: RPGMakerEngine): RPGMakerEngineCapabilities {
  return {
    animationFormat: engine,
    pluginCommandFormat: engine,
    supportsEffekseer: engine === "mz",
    supportsAutosave: engine === "mz",
    supportsFollowerDistance: engine === "mz",
    supportsMvPluginCommandHook: engine === "mv",
    supportsMzCommandRegistration: engine === "mz",
  };
}

function normalizeOverride(value: string | undefined): RPGMakerEngineOverride {
  const normalized = value?.trim().toLowerCase() || "auto";
  if (normalized !== "auto" && normalized !== "mv" && normalized !== "mz") {
    throw new Error(
      `RPGMAKER_ENGINE must be one of auto, mv, or mz; received '${value}'`
    );
  }
  return normalized;
}

/**
 * Detect the engine from the official runtime marker files.
 *
 * An explicit override is useful for stripped test fixtures and custom
 * deployments. Automatic detection remains strict so a missing or ambiguous
 * project cannot silently be treated as the wrong engine.
 */
export function detectProjectEngine(
  projectPath: string,
  override?: RPGMakerEngineOverride
): RPGMakerProjectProfile {
  if (!fs.existsSync(projectPath)) {
    throw new Error(`RPG Maker project path does not exist: ${projectPath}`);
  }

  const requested = normalizeOverride(override ?? process.env.RPGMAKER_ENGINE);
  const mvDetected = hasAllMarkers(projectPath, "mv");
  const mzDetected = hasAllMarkers(projectPath, "mz");

  if (requested !== "auto") {
    return {
      engine: requested,
      source: "override",
      markerFiles: [...ENGINE_MARKERS[requested]],
      capabilities: capabilitiesFor(requested),
    };
  }

  if (mvDetected && mzDetected) {
    throw new Error(
      `Unable to detect RPG Maker engine: both MV and MZ runtime marker sets are present in ${projectPath}`
    );
  }

  if (!mvDetected && !mzDetected) {
    throw new Error(
      `Unable to detect RPG Maker engine in ${projectPath}. Expected MV markers ${ENGINE_MARKERS.mv.join(", ")} or MZ markers ${ENGINE_MARKERS.mz.join(", ")}; set RPGMAKER_ENGINE=mv|mz only for an intentional override.`
    );
  }

  const engine: RPGMakerEngine = mvDetected ? "mv" : "mz";
  return {
    engine,
    source: "detected",
    markerFiles: [...ENGINE_MARKERS[engine]],
    capabilities: capabilitiesFor(engine),
  };
}

export function getEngineMarkers(engine: RPGMakerEngine): readonly string[] {
  return ENGINE_MARKERS[engine];
}
