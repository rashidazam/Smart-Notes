
import ollama from "ollama";

import { Client } from
  "@modelcontextprotocol/sdk/client/index.js";

import { StreamableHTTPClientTransport } from
  "@modelcontextprotocol/sdk/client/streamableHttp.js";

// 1. Connect to our deployed MCP server
const MCP_URL =
  "https://smart-notes-lovat-five.vercel.app/mcp";

const client = new Client({
  name: "smart-notes-ai-client",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL(MCP_URL)
);

async function main() {
  try {
    await client.connect(transport);

    console.log("Connected to remote MCP server");

    // 2. Discover available MCP tools
    const { tools } = await client.listTools();

    console.log(
      "Discovered tools:",
      tools.map((tool) => tool.name)
    );

    // 3. Convert MCP tool schemas to Ollama format
    const ollamaTools = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));

    // 4. Send natural language to Ollama
    const response = await ollama.chat({
      model: "llama3.2:3b",

      messages: [
        {
          role: "user",
          content:
            "Create a note titled MCP Integration " +
            "with content: My local AI model " +
            "successfully called a remote MCP tool.",
        },
      ],

      tools: ollamaTools,
    });

    // 5. Read Ollama's proposed tool calls
    const toolCalls = response.message.tool_calls || [];

    if (toolCalls.length === 0) {
      console.log("AI response:", response.message.content);
      return;
    }

    // 6. Execute each proposed MCP tool
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;

      console.log("AI selected:", name);
      console.log("Arguments:", args);

      // Only execute our intended test tool
      if (name !== "create_note") {
        console.log("Skipping unexpected tool:", name);
        continue;
      }

      const result = await client.callTool({
        name,
        arguments: args,
      });

      console.log(
        "MCP result:",
        JSON.stringify(result, null, 2)
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

main();
