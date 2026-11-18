
import ollama from "ollama";

const response = await ollama.chat({
  model: "llama3.2:3b",

  messages: [
    {
      role: "user",
      content:
        "Create a note titled React Hooks with content: " +
        "useState is used for state management.",
    },
  ],

  tools: [
    {
      type: "function",
      function: {
        name: "create_note",
        description: "Create a new note in Smart Notes",
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
  ],
});

console.log(
  JSON.stringify(response.message, null, 2)
);
