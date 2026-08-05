/**
 * Build a runtime script that reports a JSON object through the existing
 * /gamestate bridge endpoint. XHR is used because MV's embedded runtime does
 * not guarantee a global fetch implementation.
 */
export const DEFAULT_RPGMAKER_BRIDGE_PORT = 9001;

export function getRPGMakerBridgePort(): number {
  const configured = Number(process.env.RPGMAKER_BRIDGE_PORT ?? DEFAULT_RPGMAKER_BRIDGE_PORT);
  return Number.isInteger(configured) && configured > 0 && configured <= 65535
    ? configured
    : DEFAULT_RPGMAKER_BRIDGE_PORT;
}

export function xhrPostGameStateStatement(payloadExpression: string, port = getRPGMakerBridgePort()): string {
  return `var __mcpXhr = new XMLHttpRequest();
    __mcpXhr.open("POST", "http://127.0.0.1:${port}/gamestate", true);
    __mcpXhr.setRequestHeader("Content-Type", "application/json");
    __mcpXhr.send(JSON.stringify(${payloadExpression}));`;
}
