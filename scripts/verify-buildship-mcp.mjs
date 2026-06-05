#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";

const serverPath = "/Users/home/Projects/buildship/mcp-server/dist/index.js";
const expectedTools = [
  "list_nodes",
  "get_node",
  "create_node",
  "update_node_file",
  "list_workflows",
  "get_workflow",
  "create_workflow",
  "add_node_to_workflow",
  "set_flow_label",
  "get_flow_label",
];

const child = spawn(process.execPath, [serverPath], {
  cwd: "/Users/home/Projects/buildship",
  env: {
    ...process.env,
    BUILDSHIP_REPO: "/Users/home/Projects/buildship",
  },
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
const responses = new Map();

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");

child.stdout.on("data", (chunk) => {
  stdout += chunk;
  for (const line of chunk.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const message = JSON.parse(line);
      if (message.id !== undefined) responses.set(message.id, message);
    } catch {
      // MCP servers may log non-JSON diagnostics; keep raw output for failures.
    }
  }
});

child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

async function waitForResponse(id, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (responses.has(id)) return responses.get(id);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for MCP response ${id}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

try {
  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "dreamflow-buildship-mcp-verify", version: "1.0.0" },
    },
  });

  const init = await waitForResponse(1);
  if (init.error) throw new Error(`initialize failed: ${JSON.stringify(init.error)}`);

  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });

  const listed = await waitForResponse(2);
  if (listed.error) throw new Error(`tools/list failed: ${JSON.stringify(listed.error)}`);

  const tools = listed.result?.tools?.map((tool) => tool.name).sort() || [];
  const missing = expectedTools.filter((name) => !tools.includes(name));
  if (missing.length > 0) {
    throw new Error(`BuildShip MCP missing tools: ${missing.join(", ")}. Found: ${tools.join(", ")}`);
  }

  send({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "list_workflows",
      arguments: { search: "flutter-flow" },
    },
  });

  const workflows = await waitForResponse(3);
  if (workflows.error) throw new Error(`list_workflows failed: ${JSON.stringify(workflows.error)}`);

  const contentText = workflows.result?.content?.[0]?.text || "";
  if (!contentText.includes("flutter-flow")) {
    throw new Error(`BuildShip MCP did not return FlutterFlow workflows. Response: ${contentText}`);
  }

  console.log(`BuildShip MCP verified: ${tools.length} tools; FlutterFlow workflows visible.`);
} finally {
  child.stdin.end();
  child.kill();
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, 500)),
  ]);
}
