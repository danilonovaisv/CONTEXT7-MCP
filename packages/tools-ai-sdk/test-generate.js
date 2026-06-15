import { generateText, stepCountIs, tool } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { z } from "zod";

async function main() {
  let callCount = 0;
  const mockModel = new MockLanguageModelV3({
    doGenerate: async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "dummyTool",
              args: JSON.stringify({ query: "hello" }),
              input: JSON.stringify({ query: "hello" }),
            },
          ],
          finishReason: "tool-calls",
          usage: {
            inputTokens: 10,
            outputTokens: 10,
          },
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      } else {
        return {
          content: [{ type: "text", text: "Done." }],
          finishReason: "stop",
          usage: {
            inputTokens: 10,
            outputTokens: 10,
          },
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      }
    },
  });

  const dummyTool = tool({
    description: "A dummy tool",
    inputSchema: z.object({
      query: z.string(),
    }),
    execute: async ({ query }) => {
      return `Result: ${query}`;
    },
  });

  try {
    const result = await generateText({
      model: mockModel,
      tools: {
        dummyTool,
      },
      toolChoice: { type: "tool", toolName: "dummyTool" },
      stopWhen: stepCountIs(2),
      prompt: "Run the dummy tool",
    });

    console.log("RESULT STEPS:", JSON.stringify(result.steps, null, 2));
  } catch (err) {
    console.error("FATAL ERROR IN GENERATETEXT:", err.stack || err);
  }
}

main();
