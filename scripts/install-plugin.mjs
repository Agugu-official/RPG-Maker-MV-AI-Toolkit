import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { PluginTemplates } from "../dist/templates/plugin-template.js";
import { detectProjectEngine } from "../dist/rpgmaker/engine.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf-8").split(/\r?\n/)) {
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

const projectPath = process.env.RPGMAKER_PROJECT_PATH;
if (!projectPath) {
  throw new Error("RPGMAKER_PROJECT_PATH is not set in .env or the environment");
}

const profile = detectProjectEngine(projectPath, process.env.RPGMAKER_ENGINE);
const pluginsDirectory = path.join(projectPath, "js", "plugins");
if (!fs.existsSync(pluginsDirectory)) {
  throw new Error(`Plugin directory not found: ${pluginsDirectory}`);
}

const pluginPath = path.join(pluginsDirectory, "RPGMakerDebugger.js");
const bridgePort = Number(process.env.RPGMAKER_BRIDGE_PORT || 9001);
const code = PluginTemplates.debugBridge(bridgePort, profile.engine);
fs.writeFileSync(pluginPath, code, "utf-8");
console.log(`RPG Maker ${profile.engine.toUpperCase()} debug plugin written: ${pluginPath} (${code.length} bytes)`);
