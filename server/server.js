import "dotenv/config";
import express from "express";
import cors from "cors";
import noteRoutes from "./routes/noteRoutes.js";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createMcpServer } from "./mcp/mcpServer.js";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/mcp", async (req, res, next) => {
  const mcpServer = createMcpServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    // Connect our MCP tools to the HTTP transport
    await mcpServer.connect(transport);

    // Let the transport process the MCP message
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    await mcpServer.close().catch(console.error);
    next(error);
    return;
  }

  res.on("close", () => {
    mcpServer.close().catch(console.error);
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Smart Notes API is running",
  });
});

app.use("/api/notes", noteRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "Internal server error",
  });
});

// Local development only
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
