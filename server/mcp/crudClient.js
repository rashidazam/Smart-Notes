
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from
  "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL =
  process.env.MCP_URL ||
  "https://smart-notes-lovat-five.vercel.app/mcp";

const client = new Client({
  name: "smart-notes-crud-client",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL(MCP_URL)
);

async function callTool(name, args = {}) {
  const result = await client.callTool({
    name,
    arguments: args,
  });

  if (result.isError) {
    throw new Error(
      result.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n")
    );
  }

  const text = result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  try {
    await client.connect(transport);
    console.log("Connected to:", MCP_URL);

    // 1. Discover tools
    const { tools } = await client.listTools();
    console.log("Available tools:", tools.map(t => t.name));

    // 2. Create
    const created = await callTool("create_note", {
      title: "MCP CRUD Test",
      content: "Created remotely from Node.js",
    });
    console.log("CREATED:", created);

    // 3. Read
    const fetched = await callTool("get_note", {
      id: created.id,
    });
    console.log("FETCHED:", fetched);

    // 4. Update
    const updated = await callTool("update_note", {
      id: created.id,
      title: "Updated MCP CRUD Test",
      content: "Updated remotely from Node.js",
    });
    console.log("UPDATED:", updated);

    // 5. List
    const notes = await callTool("list_notes");
    console.log("TOTAL NOTES:", notes.length);

    // 6. Delete our test note
    const deleted = await callTool("delete_note", {
      id: created.id,
    });
    console.log("DELETED:", deleted);

  } catch (error) {
    console.error("MCP error:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
