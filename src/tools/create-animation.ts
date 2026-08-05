import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const CreateAnimationTool: Tool = {
  name: "create-animation",
  description:
    "Create a new animation entry in Animations.json using the detected engine's native format. " +
    "For MZ, effect_name references an Effekseer effect file; for MV, animation layer names/hues, frames, position, " +
    "and timings are used. MV and MZ animation formats are not automatically converted. " +
    "Returns the new animation_id.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Animation name shown in the editor (required)",
      },
      effect_name: {
        type: "string",
        description:
          "Effekseer effect filename from effects/ (without extension). Leave empty for a blank animation.",
      },
      display_type: {
        type: "integer",
        description:
          "Display type: 0=on target, 1=on screen center (default 0)",
      },
      offset_x: {
        type: "integer",
        description: "Horizontal offset in pixels relative to the target (default 0)",
      },
      offset_y: {
        type: "integer",
        description: "Vertical offset in pixels relative to the target (default 0)",
      },
      speed: {
        type: "integer",
        description: "Playback speed percentage (100=normal, default 100)",
      },
      animation1_name: { type: "string", description: "MV animation layer 1 image name" },
      animation1_hue: { type: "integer", description: "MV animation layer 1 hue (default 0)" },
      animation2_name: { type: "string", description: "MV animation layer 2 image name" },
      animation2_hue: { type: "integer", description: "MV animation layer 2 hue (default 0)" },
      frames: {
        type: "array",
        description: "MV frame array; defaults to one blank frame",
        items: { type: "array", items: { type: "array", items: { type: "number" } } },
      },
      position: { type: "integer", description: "MV animation position (0=head, 1=center, 2=foot, 3=screen)" },
      timings: {
        type: "array",
        description: "MV sound/flash timing entries",
        items: { type: "object", additionalProperties: true },
      },
      flash_timings: { type: "array", description: "MZ flash timing entries", items: { type: "object", additionalProperties: true } },
      sound_timings: { type: "array", description: "MZ sound timing entries", items: { type: "object", additionalProperties: true } },
    },
    required: ["name"],
  },
};
