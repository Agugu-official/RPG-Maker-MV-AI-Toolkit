import type { HandlerContext } from "./types.js";
import { RPGMakerValidator } from "../rpgmaker/validator.js";

export async function handleCreateAnimation(ctx: HandlerContext): Promise<string> {
  const { input, reader, writer, changeLog } = ctx;

  try {
    const name = (input.name as string | undefined)?.trim();
    if (!name) return JSON.stringify({ error: "name is required" });

    const mzFields = ["effect_name", "display_type", "offset_x", "offset_y", "speed", "flash_timings", "sound_timings"];
    const mvFields = ["animation1_name", "animation1_hue", "animation2_name", "animation2_hue", "frames", "position", "timings"];
    const invalidFields = (reader.engine === "mv" ? mzFields : mvFields).filter((field) => input[field] !== undefined);
    if (invalidFields.length > 0) {
      return JSON.stringify({ error: `${reader.engine.toUpperCase()} animation received fields from the other animation format`, fields: invalidFields });
    }

    const newAnimation: Record<string, unknown> = reader.engine === "mv"
      ? {
          name,
          animation1Hue: (input.animation1_hue as number | undefined) ?? 0,
          animation1Name: (input.animation1_name as string | undefined) ?? "",
          animation2Hue: (input.animation2_hue as number | undefined) ?? 0,
          animation2Name: (input.animation2_name as string | undefined) ?? "",
          frames: Array.isArray(input.frames) && input.frames.length > 0 ? input.frames : [[]],
          position: (input.position as number | undefined) ?? 0,
          timings: Array.isArray(input.timings) ? input.timings : [],
        }
      : {
          name,
          effectName: (input.effect_name as string | undefined) ?? "",
          displayType: (input.display_type as number | undefined) ?? 0,
          offsetX: (input.offset_x as number | undefined) ?? 0,
          offsetY: (input.offset_y as number | undefined) ?? 0,
          speed: (input.speed as number | undefined) ?? 100,
          flashTimings: Array.isArray(input.flash_timings) ? input.flash_timings : [],
          soundTimings: Array.isArray(input.sound_timings) ? input.sound_timings : [],
        };

    const validation = RPGMakerValidator.validateAnimation(newAnimation, reader.engine);
    if (!validation.valid) return JSON.stringify({ error: "Animation validation failed", errors: validation.errors });

    const newId = writer.addAnimation(newAnimation);

    changeLog.append({
      tool: "create-animation",
      entityType: "Animation",
      entityId: newId,
      action: "create",
      summary: `Animation ${newId} created: name='${name}'`,
    });

    return JSON.stringify({ success: true, animation_id: newId, name });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}
