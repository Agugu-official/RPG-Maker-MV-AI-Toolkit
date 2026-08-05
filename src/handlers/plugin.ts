import * as fs from "fs";
import * as path from "path";
import { RPGMakerValidator } from "../rpgmaker/validator.js";
import { getRPGMakerBridgePort } from "../rpgmaker/runtime-script.js";
import { PluginTemplates } from "../templates/plugin-template.js";
import type { HandlerContext } from "./types.js";

function generatePluginCode(
  pluginName: string,
  description: string,
  author: string,
  version: string,
  codeType: string,
  engine: "mv" | "mz",
): string {
  const target = engine === "mv" ? "MV" : "MZ";
  const header = `/*:
 * @target ${target}
 * @plugindesc ${description}
 * @author ${author}
 * @version ${version}
 *
 * @help
 * ${pluginName}
 * Version ${version}
 *
 * ${description}
 */

(() => {
  const pluginName = "${pluginName}";
  const PLUGIN_VERSION = "${version}";
`;

  let body = "";
  switch (codeType) {
    case "simple-hook":
      body = `
  const _Scene_Map_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    // Add your code here
  };
`;
      break;
    case "command":
      body = engine === "mv"
        ? `
  const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (command === pluginName && args && args[0] === "exampleCommand") {
      console.log("Example command executed with args:", args.slice(1));
    }
  };
`
        : `
  PluginManager.registerCommand(pluginName, "exampleCommand", args => {
    console.log("Example command executed with args:", args);
  });
`;
      break;
    case "skill-modifier":
      body = `
  const _Game_Battler_useItem = Game_Battler.prototype.useItem;
  Game_Battler.prototype.useItem = function(item) {
    _Game_Battler_useItem.call(this, item);
    if (DataManager.isSkill(item)) {
      // Modify skill behavior here
    }
  };
`;
      break;
    default:
      body = `
  console.log(\`\${pluginName} v\${PLUGIN_VERSION} loaded\`);
`;
  }

  return header + body + "\n})();\n";
}

function registerPlugin(
  writer: HandlerContext["writer"],
  filename: string,
  description: string,
): void {
  try {
    writer.updatePluginsRegistry({
      name: filename.replace(/\.js$/i, ""),
      status: true,
      description: description || "",
      parameters: {},
    });
  } catch {
    // registry update is best-effort
  }
}

export async function handleCreatePlugin(ctx: HandlerContext): Promise<string> {
  const { input, reader, writer, projectPath } = ctx;
  const pluginName = input.plugin_name as string;
  const description = input.description as string;
  const author = (input.author as string | undefined) || "Unknown";
  const version = (input.version as string | undefined) || "1.0.0";
  const codeType = (input.code_type as string) || "empty";

  const pluginCode = generatePluginCode(pluginName, description, author, version, codeType, reader.engine);

  const validation = RPGMakerValidator.validateJavaScript(pluginCode, reader.engine);
  if (!validation.valid) {
    return JSON.stringify({ error: "Plugin code validation failed", errors: validation.errors });
  }

  try {
    const filename = `${pluginName}.js`.replace(/\.js+$/i, ".js");
    writer.writePlugin(filename, pluginCode);
    registerPlugin(writer, filename, description);
    ctx.changeLog.append({ tool: "create-plugin", entityType: "Plugin", action: "create", summary: `Plugin '${filename}' created (type: ${codeType})` });

    return JSON.stringify({
      success: true,
      message: "Plugin created",
      filename,
      path: path.join(projectPath, "js", "plugins", filename),
    });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}

export async function handleCreatePluginAdvanced(ctx: HandlerContext): Promise<string> {
  const { input, reader, writer } = ctx;
  const pluginName = input.plugin_name as string;
  const description = input.description as string;
  const author = (input.author as string | undefined) || "Unknown";
  const version = (input.version as string | undefined) || "1.0.0";
  const templateType = input.template_type as string;
  const parameters = input.parameters as Array<{ name: string; type: string; default: string; description: string }> | undefined;

  let pluginCode: string;

  try {
    switch (templateType) {
      case "with-parameters":
        pluginCode = PluginTemplates.withParameters(pluginName, description, author, version, parameters || [], reader.engine);
        break;
      case "game-actor":
        pluginCode = PluginTemplates.gameActorExtension(pluginName, description, author, version, reader.engine);
        break;
      case "game-enemy":
        pluginCode = PluginTemplates.gameEnemyExtension(pluginName, description, author, version, reader.engine);
        break;
      case "event-handler":
        pluginCode = PluginTemplates.eventHandler(pluginName, description, author, version, reader.engine);
        break;
      case "custom-ui":
        pluginCode = PluginTemplates.customUI(pluginName, description, author, version, reader.engine);
        break;
      default:
        return JSON.stringify({ error: `Unknown template type: ${templateType}` });
    }

    const validation = RPGMakerValidator.validateJavaScript(pluginCode, reader.engine);
    if (!validation.valid) {
      return JSON.stringify({ error: "Plugin validation failed", errors: validation.errors });
    }

    const filename = `${pluginName}.js`;
    writer.writePlugin(filename, pluginCode);
    registerPlugin(writer, filename, description);
    ctx.changeLog.append({ tool: "create-plugin-advanced", entityType: "Plugin", action: "create", summary: `Advanced plugin '${filename}' created (template: ${templateType})` });

    return JSON.stringify({
      success: true,
      message: `Advanced plugin created with template: ${templateType}`,
      filename,
      lines: pluginCode.split("\n").length,
    });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}

export async function handleSetupDebugPlugin(ctx: HandlerContext): Promise<string> {
  const { reader, writer, projectPath } = ctx;
  const bridgePort = getRPGMakerBridgePort();

  try {
    const pluginCode = PluginTemplates.debugBridge(bridgePort, reader.engine);

    const validation = RPGMakerValidator.validateJavaScript(pluginCode, reader.engine);
    if (!validation.valid) {
      return JSON.stringify({ error: "Plugin validation failed", errors: validation.errors });
    }

    const pluginsJsPath = path.join(projectPath, "js", "plugins.js");
    let existingContent = "";
    try { existingContent = fs.readFileSync(pluginsJsPath, "utf-8"); } catch { /* new project */ }
    const alreadyRegistered = existingContent.includes('"RPGMakerDebugger"');

    // Write and register the debug plugin (status: true — it is intentionally being activated)
    const filename = "RPGMakerDebugger.js";
    writer.writePlugin(filename, pluginCode);
    registerPlugin(writer, filename, "AI Debug Bridge - MCP runtime control");

    // Scan js/plugins/ and register any other .js files that are not yet in plugins.js
    // so they appear in the RPG Maker Plugin Manager (status: false — user opts in)
    const pluginsFolderPath = path.join(projectPath, "js", "plugins");
    const newlyRegistered: string[] = [];
    try {
      const files = fs.readdirSync(pluginsFolderPath).filter((f) => f.endsWith(".js"));
      // Re-read plugins.js after we just wrote it to get the current registered names
      let currentContent = "";
      try { currentContent = fs.readFileSync(pluginsJsPath, "utf-8"); } catch { /* ignore */ }

      for (const file of files) {
        const pluginName = file.replace(/\.js$/i, "");
        if (pluginName === "RPGMakerDebugger") continue; // already registered above
        if (currentContent.includes(`"${pluginName}"`)) continue; // already in registry

        writer.updatePluginsRegistry({
          name: pluginName,
          status: false,
          description: "",
          parameters: {},
        });
        // Update currentContent for next iteration check
        try { currentContent = fs.readFileSync(pluginsJsPath, "utf-8"); } catch { /* ignore */ }
        newlyRegistered.push(pluginName);
      }
    } catch { /* folder doesn't exist or unreadable — skip */ }

    const action = alreadyRegistered ? "update" : "create";
    ctx.changeLog.append({
      tool: "setup-debug-plugin",
      entityType: "Plugin",
      action,
      summary: `Debug bridge plugin installed on port ${bridgePort}; synced ${newlyRegistered.length} additional plugins`,
    });

    return JSON.stringify({
      success: true,
      message: alreadyRegistered
        ? `Debug plugin updated (port ${bridgePort})`
        : `Debug plugin installed (port ${bridgePort})`,
      filename,
      port: bridgePort,
      synced_plugins: newlyRegistered,
      instructions: [
        `1. Close and reopen the RPG Maker ${reader.engine.toUpperCase()} project (so it picks up the changes)`,
        "2. Open Plugin Manager — RPGMakerDebugger is enabled; other plugins appear disabled (activate as needed)",
        "3. Press Play (F5) to launch the game",
        "4. Use 'start-encounter' or other runtime tools — the game connects automatically",
      ].join("\n"),
    });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}
