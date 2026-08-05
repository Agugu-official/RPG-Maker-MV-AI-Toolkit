import * as fs from "fs";
import * as path from "path";
import type { HandlerContext } from "./types.js";
import { RPGMakerValidator } from "../rpgmaker/validator.js";

export async function handleReadAnimation(ctx: HandlerContext): Promise<string> {
  const { input, projectPath } = ctx;

  try {
    const filePath = path.join(projectPath, "data", "Animations.json");
    if (!fs.existsSync(filePath)) {
      return JSON.stringify({ error: "Animations.json not found in project" });
    }

    const animations = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Array<Record<string, unknown> | null>;
    const animationId = input.animation_id as number | undefined;

    if (animationId !== undefined) {
      if (typeof animationId !== "number" || animationId < 1) {
        return JSON.stringify({ error: "animation_id must be a positive integer" });
      }
      const anim = animations.find((a) => a !== null && (a as Record<string, unknown>).id === animationId);
      if (!anim) return JSON.stringify({ error: `Animation ${animationId} not found` });
      return JSON.stringify({ success: true, animation: anim });
    }

    // List all
    const list = animations
      .filter((a): a is Record<string, unknown> => a !== null)
      .map((a) => ({ id: a.id, name: a.name }));

    return JSON.stringify({ success: true, animations: list, count: list.length });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}

export async function handleEditAnimation(ctx: HandlerContext): Promise<string> {
  const { input, reader, writer, projectPath, changeLog } = ctx;

  try {
    const animationId = input.animation_id as number;
    if (typeof animationId !== "number" || animationId < 1) {
      return JSON.stringify({ error: "animation_id must be a positive integer" });
    }

    const filePath = path.join(projectPath, "data", "Animations.json");
    if (!fs.existsSync(filePath)) {
      return JSON.stringify({ error: "Animations.json not found in project" });
    }

    const animations = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Array<Record<string, unknown> | null>;
    const idx = animations.findIndex((a) => a !== null && (a as Record<string, unknown>).id === animationId);
    if (idx === -1) return JSON.stringify({ error: `Animation ${animationId} not found` });

    const updates: Record<string, unknown> = {};
    const changes: string[] = [];

    if (input.name !== undefined) { updates.name = input.name; changes.push(`name='${input.name}'`); }

    if (reader.engine === "mv") {
      const mzFields = ["effect_name", "display_type", "offset_x", "offset_y", "speed", "flash_timings", "sound_timings"];
      const usedMzFields = mzFields.filter((field) => input[field] !== undefined);
      if (usedMzFields.length > 0) {
        return JSON.stringify({ error: `MV animations do not support MZ fields: ${usedMzFields.join(", ")}` });
      }
      const mvUpdates: Record<string, unknown> = {};
      const fieldMap: Array<[string, string]> = [
        ["animation1_name", "animation1Name"],
        ["animation1_hue", "animation1Hue"],
        ["animation2_name", "animation2Name"],
        ["animation2_hue", "animation2Hue"],
        ["frames", "frames"],
        ["position", "position"],
        ["timings", "timings"],
      ];
      for (const [inputName, outputName] of fieldMap) {
        if (input[inputName] !== undefined) mvUpdates[outputName] = input[inputName];
      }
      const candidate = { ...(animations[idx] as Record<string, unknown>), ...updates, ...mvUpdates };
      const validation = RPGMakerValidator.validateAnimation(candidate, "mv");
      if (!validation.valid) return JSON.stringify({ error: "Animation validation failed", errors: validation.errors });
      Object.assign(updates, mvUpdates);
      for (const name of Object.keys(mvUpdates)) changes.push(name);
    } else {
      const mvFields = ["animation1_name", "animation1_hue", "animation2_name", "animation2_hue", "frames", "position", "timings"];
      const usedMvFields = mvFields.filter((field) => input[field] !== undefined);
      if (usedMvFields.length > 0) {
        return JSON.stringify({ error: `MZ animations do not support MV fields: ${usedMvFields.join(", ")}` });
      }
      if (input.effect_name !== undefined) { updates.effectName = input.effect_name; changes.push(`effectName='${input.effect_name}'`); }
      if (input.display_type !== undefined) { updates.displayType = input.display_type; changes.push(`displayType=${input.display_type}`); }
      if (input.offset_x !== undefined) { updates.offsetX = input.offset_x; changes.push(`offsetX=${input.offset_x}`); }
      if (input.offset_y !== undefined) { updates.offsetY = input.offset_y; changes.push(`offsetY=${input.offset_y}`); }
      if (input.speed !== undefined) { updates.speed = input.speed; changes.push(`speed=${input.speed}`); }
      const candidate = { ...(animations[idx] as Record<string, unknown>), ...updates };
      const validation = RPGMakerValidator.validateAnimation(candidate, "mz");
      if (!validation.valid) return JSON.stringify({ error: "Animation validation failed", errors: validation.errors });
    }

    if (changes.length === 0) {
      return JSON.stringify({ error: reader.engine === "mv"
        ? "No fields to update. Provide at least one MV animation field"
        : "No fields to update. Provide at least one MZ animation field" });
    }

    writer.updateAnimation(animationId, updates);

    changeLog.append({
      tool: "edit-animation",
      entityType: "Animation",
      entityId: animationId,
      action: "update",
      summary: `Animation ${animationId} updated: ${changes.join(", ")}`,
    });

    return JSON.stringify({ success: true, animation_id: animationId, changes: changes.join(", ") });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}
