"use strict";

// Compatibility entry point for older workflows. The current installer
// generates the detected MV/MZ plugin and uses the shared HTTP bridge.
const path = require("path");
const { spawnSync } = require("child_process");

const scriptPath = path.join(__dirname, "install-plugin.mjs");
const result = spawnSync(process.execPath, [scriptPath], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
