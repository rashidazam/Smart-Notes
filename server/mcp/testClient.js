
import { Client } from
  "@modelcontextprotocol/sdk/client/index.js";

import { StreamableHTTPClientTransport } from
  "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Step 1: Create an MCP client
const client = new Client({
  name: "smart-notes-test-client",
  version: "1.0.0",
});

const MCP_URL =
  process.env.MCP_URL ||
  "http://localhost:5000/mcp";

const transport = new StreamableHTTPClientTransport(
  new URL(MCP_URL)
);

try {
  await client.connect(transport);

  console.log("Connected to MCP server!");

  // Step 3: Discover available tools
  const tools = await client.listTools();

  console.log("Available tools:");
  console.log(JSON.stringify(tools, null, 2));

  // Step 4: Execute our first tool
  const result = await client.callTool({
    name: "list_notes",
    arguments: {},
  });

  console.log("Notes returned by MCP:");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("MCP client error:", error);
} finally {
  await client.close();
}
