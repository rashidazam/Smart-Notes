
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllNotes } from "../services/noteService.js";

export function createMcpServer() {
  // Step 1: Create an MCP server
  const server = new McpServer({
    name: "smart-notes-mcp",
    version: "1.0.0",
  });

  // Step 2: Register our first MCP tool
  server.registerTool(
    "list_notes",
    {
      description: "Get all notes from Smart Notes",
      inputSchema: {},
    },
    async () => {
      // Step 3: Reuse our existing Node.js service
      const notes = await getAllNotes();

      // Step 4: Return an MCP tool result
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(notes, null, 2),
          },
        ],
      };
    }
  );

  return server;
}
