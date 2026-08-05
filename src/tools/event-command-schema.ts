const commandTypes = [
  "message", "choice", "wait", "transfer", "script", "switch", "variable", "common-event", "battle", "animation",
  "conditional-branch", "loop", "break-loop", "exit-event", "label", "jump-to-label", "control-self-switch",
  "change-gold", "change-item", "change-weapon", "change-armor", "add-party-member", "remove-party-member",
  "change-hp", "change-mp", "change-tp", "recover-all", "change-state", "shop", "show-picture", "tint-picture",
  "erase-picture", "play-bgm", "play-se", "play-me", "stop-bgm", "fade-out", "fade-in", "play-movie",
  "change-battle-bgm", "change-victory-me", "change-defeat-me", "change-vehicle-bgm", "comment", "change-variable",
  "input-number", "select-item", "show-scrolling-text", "name-input", "tint-screen", "shake-screen", "flash-screen",
  "play-bgs", "change-exp", "change-level", "change-skill", "change-equipment", "change-class", "save-bgm",
  "resume-bgm", "fade-out-bgs", "stop-se", "change-parameter", "change-name", "change-nickname", "change-profile",
  "scroll-map", "change-weather", "change-followers", "gather-followers", "set-vehicle-location", "vehicle-ride",
  "set-movement-route", "get-location-info", "change-map-name-display", "change-tileset", "change-battle-back",
  "control-timer", "change-transparency", "erase-event", "open-menu", "open-save", "game-over", "return-to-title",
  "change-save-access", "change-menu-access", "change-encounter", "change-formation-access", "change-window-color",
  "plugin-command", "show-balloon", "set-event-location", "move-picture", "rotate-picture", "change-actor-images",
  "toggle-party-member", "change-enemy-hp", "change-enemy-mp", "change-enemy-tp", "change-enemy-state",
  "recover-all-enemies", "enemy-appear", "enemy-transform", "show-battle-animation", "force-action",
] as const;

export const eventCommandSchema = {
  type: "object",
  description: "Event command. data may be a legacy string or a structured object.",
  properties: {
    type: {
      type: "string",
      enum: [...commandTypes],
      description: "Command type",
    },
    data: {
      anyOf: [
        { type: "string", description: "Legacy string payload" },
        {
          type: "object",
          description: "Structured command payload",
          properties: {
            plugin_name: { type: "string", description: "MZ plugin name; optional diagnostic label for MV" },
            command_name: { type: "string", description: "MZ command name or first MV plugin-command token" },
            args: { type: "object", description: "MZ command arguments", additionalProperties: { type: "string" } },
            mv_args: { type: "array", description: "Additional MV plugin-command tokens", items: { type: "string" } },
            raw_command: { type: "string", description: "Complete MV plugin command line; do not combine with structured MV fields" },
          },
          additionalProperties: true,
        },
      ],
      description: "Command payload. plugin-command uses MV raw_command/mv_args or MZ plugin_name/command_name/args.",
    },
  },
  required: ["type"],
};
