import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const ReadAnimationTool: Tool = {
  name: "read-animation",
  description:
    "Read animation data from Animations.json. The returned shape follows the detected engine: MV uses " +
    "animation1/2Name, animation1/2Hue, frames, position, and timings; MZ uses Effekseer metadata and timelines. " +
    "When animation_id is omitted, lists all animations with id and name.",
  inputSchema: {
    type: "object",
    properties: {
      animation_id: {
        type: "integer",
        description: "Animation ID to read. Omit to list all animations.",
      },
    },
  },
};

export const EditAnimationTool: Tool = {
  name: "edit-animation",
  description:
    "Edit an existing animation using the detected engine's native format. MV accepts animation1/2Name, animation1/2Hue, " +
    "frames, position, and timings. MZ accepts effect_name, display_type, offsets, speed, and timeline arrays. " +
    "MV and MZ animation fields are intentionally not converted between formats.",
  inputSchema: {
    type: "object",
    properties: {
      animation_id: {
        type: "integer",
        description: "ID of the animation to edit",
      },
      name: {
        type: "string",
        description: "Display name of the animation",
      },
      effect_name: {
        type: "string",
        description: "Effekseer effect file name from the effects/ folder (without extension)",
      },
      display_type: {
        type: "integer",
        description: "Display position: 0=on target head, 1=on target center, 2=full screen, -1=front of screen",
      },
      offset_x: {
        type: "integer",
        description: "Horizontal offset in pixels",
      },
      offset_y: {
        type: "integer",
        description: "Vertical offset in pixels",
      },
      speed: {
        type: "integer",
        description: "Playback speed as a percentage (100 = normal)",
      },
      animation1_name: { type: "string", description: "MV animation layer 1 image name" },
      animation1_hue: { type: "integer", description: "MV animation layer 1 hue" },
      animation2_name: { type: "string", description: "MV animation layer 2 image name" },
      animation2_hue: { type: "integer", description: "MV animation layer 2 hue" },
      frames: {
        type: "array",
        description: "MV frame array; each frame is an array of cell data",
        items: { type: "array", items: { type: "array", items: { type: "number" } } },
      },
      position: { type: "integer", description: "MV animation position (0=head, 1=center, 2=foot, 3=screen)" },
      timings: {
        type: "array",
        description: "MV sound/flash timing entries",
        items: { type: "object", additionalProperties: true },
      },
    },
    required: ["animation_id"],
  },
};
