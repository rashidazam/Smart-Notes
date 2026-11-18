
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} from "../services/noteService.js";


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


server.registerTool(
  "get_note",
  {
    description: "Get a Smart Notes note by its ID",
    inputSchema: {
      id: z.string().min(1),
    },
  },
  async ({ id }) => {
    const note = await getNoteById(id);

    if (!note) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Note with ID ${id} not found`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(note, null, 2),
        },
      ],
    };
  }
);


server.registerTool(
  "create_note",
  {
    description: "Create a new Smart Notes note",
    inputSchema: {
      title: z.string().min(1),
      content: z.string().min(1),
    },
  },
  async ({ title, content }) => {
    const note = await createNote({ title, content });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(note, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "update_note",
  {
    description: "Update an existing Smart Notes note",
    inputSchema: {
      id: z.string().min(1),
      title: z.string().min(1),
      content: z.string().min(1),
    },
  },
  async ({ id, title, content }) => {
    const note = await updateNote(id, { title, content });

    if (!note) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Note with ID ${id} not found`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(note, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "delete_note",
  {
    description: "Delete a Smart Notes note by ID",
    inputSchema: {
      id: z.string().min(1),
    },
  },
  async ({ id }) => {
    const deleted = await deleteNote(id);

    if (!deleted) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Note with ID ${id} not found`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Note ${id} deleted successfully`,
        },
      ],
    };
  }
);



  return server;
}
