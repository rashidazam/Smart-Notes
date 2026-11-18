
import ollama from "ollama";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from
  "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL =
  process.env.MCP_URL ||
  "https://smart-notes-lovat-five.vercel.app/mcp";

const MODEL = "llama3.2:3b";
const MAX_STEPS = 8;

const client = new Client({
  name: "smart-notes-agent",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL(MCP_URL)
);

const rl = createInterface({
  input: stdin,
  output: stdout,
});

// ---------- Helpers ----------

function errorResult(message) {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

function successResult(data) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify(data),
    }],
  };
}

function parseResult(result) {
  if (result.isError) {
    throw new Error(
      result.content
        ?.filter(item => item.type === "text")
        .map(item => item.text)
        .join("\n") || "MCP tool failed"
    );
  }

  const text = result.content
    ?.filter(item => item.type === "text")
    .map(item => item.text)
    .join("\n");

  if (!text) {
    throw new Error("Empty MCP response");
  }

  return JSON.parse(text);
}

async function callMcp(name, args = {}) {
  const result = await client.callTool({
    name,
    arguments: args,
  });

  if (result.isError) {
    throw new Error(
      result.content
        ?.filter(item => item.type === "text")
        .map(item => item.text)
        .join("\n") || `${name} failed`
    );
  }

  return result;
}

async function confirm(message) {
  const answer = await rl.question(
    `${message} (yes/no): `
  );

  return answer.trim().toLowerCase() === "yes";
}

// ---------- Note lookup ----------

function normalize(value) {
  return value.trim().toLowerCase();
}

async function findNoteByTitle(title) {
  const result = await callMcp("list_notes");
  const notes = parseResult(result);

  if (!Array.isArray(notes)) {
    throw new Error("Expected an array of notes");
  }

  const target = normalize(title);

  // Exact matches first
  let matches = notes.filter(
    note => normalize(note.title) === target
  );

  // Partial matching only if no exact match
  if (matches.length === 0) {
    matches = notes.filter(
      note => normalize(note.title).includes(target)
    );
  }

  if (matches.length === 0) {
    throw new Error(
      `No note found with title "${title}".`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Multiple notes match "${title}": ` +
      matches.map(n => `${n.title} (${n.id})`).join(", ") +
      ". Ask the user to clarify."
    );
  }

  return matches[0];
}

// ---------- Virtual tools ----------

async function updateNoteByTitle(args) {
  const { title, content } = args;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    throw new Error(
      "update_note_by_title requires title and content"
    );
  }

  // 1. Find the real note
  const note = await findNoteByTitle(title);

  console.log("\nFound note:");
  console.log("ID:", note.id);
  console.log("Title:", note.title);
  console.log("Old content:", note.content);
  console.log("New content:", content);

  // 2. Confirm the operation
  const approved = await confirm("Apply this update?");

  if (!approved) {
    throw new Error("User declined the update.");
  }

  // 3. Update using the REAL note ID
  await callMcp("update_note", {
    id: note.id,
    title: note.title,
    content,
  });

  // 4. Verify the update
  const verifyResult = await callMcp("get_note", {
    id: note.id,
  });

  const updatedNote = parseResult(verifyResult);

  if (
    updatedNote.id !== note.id ||
    updatedNote.title !== note.title ||
    updatedNote.content !== content
  ) {
    throw new Error(
      "Update verification failed. Check the note."
    );
  }

  return successResult({
    success: true,
    message: "Note updated and verified",
    note: updatedNote,
  });
}

async function getNoteByTitle(args) {
  if (
    typeof args.title !== "string" ||
    !args.title.trim()
  ) {
    throw new Error("A note title is required");
  }

  const note = await findNoteByTitle(args.title);

  const result = await callMcp("get_note", {
    id: note.id,
  });

  return successResult(parseResult(result));
}

async function createNote(args) {
  const { title, content } = args;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    throw new Error("Title and content are required");
  }

  console.log("\nCreate note:");
  console.log("Title:", title);
  console.log("Content:", content);

  if (!(await confirm("Create this note?"))) {
    throw new Error("User declined creation.");
  }

  return callMcp("create_note", { title, content });
}

async function deleteNoteByTitle(args) {
  if (
    typeof args.title !== "string" ||
    !args.title.trim()
  ) {
    throw new Error("A note title is required");
  }

  const note = await findNoteByTitle(args.title);

  console.log("\nDelete note:");
  console.log("ID:", note.id);
  console.log("Title:", note.title);
  console.log("Content:", note.content);

  if (!(await confirm("Delete this note?"))) {
    throw new Error("User declined deletion.");
  }

  const result = await callMcp("delete_note", {
    id: note.id,
  });

  // Verify the note is gone
  const check = await client.callTool({
    name: "get_note",
    arguments: { id: note.id },
  });

  if (!check.isError) {
    throw new Error(
      "Deletion verification failed. Note still exists."
    );
  }

  return successResult({
    success: true,
    message: "Note deleted and verified",
    title: note.title,
    id: note.id,
  });
}

// ---------- Ollama tool definitions ----------

// These are virtual tools exposed to Ollama.
// Our Node.js client translates them into real MCP calls.

const aiTools = [
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "List all Smart Notes",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_note_by_title",
      description: "Find and read a note by its title",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_note_by_title",
      description:
        "Find a note by title and update only its content. " +
        "The application resolves the ID automatically.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Existing note title",
          },
          content: {
            type: "string",
            description: "New note content",
          },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_note_by_title",
      description: "Find and delete a note by its title",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
];

// ---------- Tool execution ----------

async function executeTool(name, args) {
  try {
    switch (name) {
      case "list_notes": {
        const result = await callMcp("list_notes");
        const notes = parseResult(result);

        // Send compact data to the model
        return successResult(
          notes.map(note => ({
            title: note.title,
            content: note.content,
          }))
        );
      }

      case "get_note_by_title":
        return await getNoteByTitle(args);

      case "update_note_by_title":
        return await updateNoteByTitle(args);

      case "create_note":
        return await createNote(args);

      case "delete_note_by_title":
        return await deleteNoteByTitle(args);

      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return errorResult(error.message);
  }
}

// ---------- Main agent loop ----------

async function main() {
  try {
    await client.connect(transport);

    console.log("Connected to MCP server");

    // Verify that the required MCP tools exist
    const { tools } = await client.listTools();
    const names = new Set(tools.map(t => t.name));

    const required = [
      "list_notes",
      "get_note",
      "create_note",
      "update_note",
      "delete_note",
    ];

    for (const name of required) {
      if (!names.has(name)) {
        throw new Error(`Missing MCP tool: ${name}`);
      }
    }

    console.log(
      "Available AI tools:",
      aiTools.map(t => t.function.name)
    );

    const prompt =
      process.argv.slice(2).join(" ") ||
      "List all my notes.";

    const messages = [
      {
        role: "system",
        content: `
You are a Smart Notes assistant.

Use the provided tools to manage notes.

IMPORTANT:
- Notes are identified by their titles.
- Use update_note_by_title to change note content.
- Use get_note_by_title to read a note.
- Use delete_note_by_title to delete a note.
- Never invent note IDs.
- Never claim success when a tool returns an error.
- If a tool reports multiple matches, ask for clarification.
- After a successful update, the tool already verifies it.
- Do not repeat a successful write operation.
- Give a concise final response based on tool results.
        `.trim(),
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    for (let step = 1; step <= MAX_STEPS; step++) {
      console.log(`\n--- Agent step ${step} ---`);

      const response = await ollama.chat({
        model: MODEL,
        messages,
        tools: aiTools,
      });

      messages.push(response.message);

      const toolCalls =
        response.message.tool_calls || [];

      if (toolCalls.length === 0) {
        console.log(
          "\nAI:",
          response.message.content ||
          "No final response generated."
        );
        return;
      }

      // Execute one tool per model turn.
      // This avoids running dependent calls together.
      const toolCall = toolCalls[0];

      const name = toolCall.function.name;
      let args = toolCall.function.arguments || {};

      if (typeof args === "string") {
        try {
          args = JSON.parse(args);
        } catch {
          args = {};
        }
      }

      console.log("Selected tool:", name);
      console.log("Arguments:", args);

      const result = await executeTool(name, args);

      console.log(
        "Tool result:",
        JSON.stringify(result, null, 2)
      );

      messages.push({
        role: "tool",
        tool_name: name,
        content: JSON.stringify(result),
      });

      // If the tool failed, stop instead of letting
      // the model invent a success response.
      if (result.isError) {
        console.log(
          "\nOperation not completed:",
          result.content[0].text
        );
        return;
      }

      // Once a write succeeds, stop further tool
      // execution to prevent duplicate writes.
      if ([
        "create_note",
        "update_note_by_title",
        "delete_note_by_title",
      ].includes(name)) {
        console.log(
          "\nOperation completed:",
          result.content[0].text
        );
        return;
      }
    }

    console.log("Agent reached maximum steps.");
  } catch (error) {
    console.error("Agent error:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await client.close();
  }
}

main();
