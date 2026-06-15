import { describe, test, expect, vi } from "vitest";
import { generateText, stepCountIs, tool } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { z } from "zod";
import {
  resolveLibraryId,
  queryDocs,
  Context7Agent,
  SYSTEM_PROMPT,
  AGENT_PROMPT,
  RESOLVE_LIBRARY_ID_DESCRIPTION,
} from "./index";

// Mock the Context7 SDK client
vi.mock("@upstash/context7-sdk", () => {
  return {
    Context7: class {
      searchLibrary = vi.fn().mockResolvedValue("Context7-compatible library ID: /facebook/react");
      getContext = vi.fn().mockResolvedValue("Mocked documentation content about hooks");
    }
  };
});

describe("@upstash/context7-tools-ai-sdk", () => {
  describe("Tool structure", () => {
    test("resolveLibraryId() should return a tool object with correct structure", () => {
      const tool = resolveLibraryId();

      expect(tool).toBeDefined();
      expect(tool).toHaveProperty("execute");
      expect(tool).toHaveProperty("inputSchema");
      expect(tool).toHaveProperty("description");
      expect(tool.description).toContain("library");
    });

    test("queryDocs() should return a tool object with correct structure", () => {
      const tool = queryDocs();

      expect(tool).toBeDefined();
      expect(tool).toHaveProperty("execute");
      expect(tool).toHaveProperty("inputSchema");
      expect(tool).toHaveProperty("description");
      expect(tool.description).toContain("documentation");
    });

    test("tools should accept custom config", () => {
      const resolveTool = resolveLibraryId({
        apiKey: "ctx7sk-test-key",
      });

      const docsTool = queryDocs({
        apiKey: "ctx7sk-test-key",
      });

      expect(resolveTool).toHaveProperty("execute");
      expect(docsTool).toHaveProperty("execute");
    });
  });

  describe("Tool usage with generateText", () => {
    test("resolveLibraryId tool should be called when searching for a library", async () => {
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
                  toolName: "resolveLibraryId",
                  args: JSON.stringify({ query: "Search for 'react' library", libraryName: "react" }),
                  input: JSON.stringify({ query: "Search for 'react' library", libraryName: "react" }),
                },
              ],
              finishReason: "tool-calls",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 10, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          } else {
            return {
              content: [{ type: "text", text: "React library ID resolved." }],
              finishReason: "stop",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 10, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          }
        },
      });

      const result = await generateText({
        model: mockModel,
        tools: {
          resolveLibraryId: resolveLibraryId(),
        },
        toolChoice: { type: "tool", toolName: "resolveLibraryId" },
        stopWhen: stepCountIs(2),
        prompt: "Search for 'react' library",
      });

      const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
      const allToolResults = result.steps.flatMap((step) => step.toolResults);

      expect(allToolCalls.length).toBeGreaterThan(0);
      expect(allToolCalls[0].toolName).toBe("resolveLibraryId");
      expect(allToolResults.length).toBeGreaterThan(0);
      const toolResult = allToolResults[0] as unknown as { output: string };
      expect(typeof toolResult.output).toBe("string");
      expect(toolResult.output).toContain("Context7-compatible library ID");
    });

    test("queryDocs tool should fetch documentation", async () => {
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
                  toolName: "queryDocs",
                  args: JSON.stringify({ libraryId: "/facebook/react", query: "hooks" }),
                  input: JSON.stringify({ libraryId: "/facebook/react", query: "hooks" }),
                },
              ],
              finishReason: "tool-calls",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 10, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          } else {
            return {
              content: [{ type: "text", text: "React documentation loaded." }],
              finishReason: "stop",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 10, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          }
        },
      });

      const result = await generateText({
        model: mockModel,
        tools: {
          queryDocs: queryDocs(),
        },
        toolChoice: { type: "tool", toolName: "queryDocs" },
        stopWhen: stepCountIs(2),
        prompt: "Fetch documentation for library ID '/facebook/react' about hooks",
      });

      const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
      const allToolResults = result.steps.flatMap((step) => step.toolResults);

      expect(allToolCalls.length).toBeGreaterThan(0);
      expect(allToolCalls[0].toolName).toBe("queryDocs");
      expect(allToolResults.length).toBeGreaterThan(0);
      const toolResult = allToolResults[0] as unknown as { output: string };
      expect(typeof toolResult.output).toBe("string");
      expect(toolResult.output.length).toBeGreaterThan(0);
    });

    test("both tools can work together in a multi-step flow", async () => {
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
                  toolName: "resolveLibraryId",
                  args: JSON.stringify({ query: "find Next.js library", libraryName: "Next.js" }),
                  input: JSON.stringify({ query: "find Next.js library", libraryName: "Next.js" }),
                },
              ],
              finishReason: "tool-calls",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 20, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          } else if (callCount === 2) {
            return {
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call-2",
                  toolName: "queryDocs",
                  args: JSON.stringify({ libraryId: "/vercel/next.js", query: "routing" }),
                  input: JSON.stringify({ libraryId: "/vercel/next.js", query: "routing" }),
                },
              ],
              finishReason: "tool-calls",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 20, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          } else {
            return {
              content: [{ type: "text", text: "Finished flow." }],
              finishReason: "stop",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 20, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          }
        },
      });

      const result = await generateText({
        model: mockModel,
        tools: {
          resolveLibraryId: resolveLibraryId(),
          queryDocs: queryDocs(),
        },
        stopWhen: stepCountIs(5),
        prompt:
          "First use resolveLibraryId to find the Next.js library, then use queryDocs to get documentation about routing",
      });

      const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
      const toolNames = allToolCalls.map((call) => call.toolName);
      expect(toolNames).toContain("resolveLibraryId");
      expect(toolNames).toContain("queryDocs");
    });
  });

  describe("Context7Agent class", () => {
    test("should create an agent instance with model", () => {
      const mockModel = new MockLanguageModelV3({});
      const agent = new Context7Agent({
        model: mockModel,
      });

      expect(agent).toBeDefined();
      expect(agent).toHaveProperty("generate");
      expect(agent).toHaveProperty("stream");
    });

    test("should accept custom stopWhen condition", () => {
      const mockModel = new MockLanguageModelV3({});
      const agent = new Context7Agent({
        model: mockModel,
        stopWhen: stepCountIs(3),
      });

      expect(agent).toBeDefined();
    });

    test("should accept custom instructions", () => {
      const mockModel = new MockLanguageModelV3({});
      const agent = new Context7Agent({
        model: mockModel,
        instructions: "Custom instructions for testing",
      });

      expect(agent).toBeDefined();
    });

    test("should accept Context7 config options", () => {
      const mockModel = new MockLanguageModelV3({});
      const agent = new Context7Agent({
        model: mockModel,
        apiKey: "ctx7sk-test-key",
      });

      expect(agent).toBeDefined();
    });

    test("should accept additional tools alongside Context7 tools", () => {
      const mockModel = new MockLanguageModelV3({});
      const customTool = tool({
        description: "A custom test tool",
        inputSchema: z.object({
          input: z.string().describe("Test input"),
        }),
        execute: async ({ input }) => ({ result: `processed: ${input}` }),
      });

      const agent = new Context7Agent({
        model: mockModel,
        tools: {
          customTool,
        },
      });

      expect(agent).toBeDefined();
    });

    test("should generate response using agent workflow", async () => {
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
                  toolName: "resolveLibraryId",
                  args: JSON.stringify({ query: "Find React", libraryName: "React" }),
                  input: JSON.stringify({ query: "Find React", libraryName: "React" }),
                },
              ],
              finishReason: "tool-calls",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 20, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          } else {
            return {
              content: [{ type: "text", text: "React docs found." }],
              finishReason: "stop",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 20, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          }
        },
      });

      const agent = new Context7Agent({
        model: mockModel,
        stopWhen: stepCountIs(5),
      });

      const result = await agent.generate({
        prompt: "Find the React library and get documentation about hooks",
      });

      expect(result).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);

      const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
      const toolNames = allToolCalls.map((call) => call.toolName);
      expect(toolNames).toContain("resolveLibraryId");
    });

    test("should include Context7 tools in generate result", async () => {
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
                  toolName: "resolveLibraryId",
                  args: JSON.stringify({ query: "Next.js", libraryName: "Next.js" }),
                  input: JSON.stringify({ query: "Next.js", libraryName: "Next.js" }),
                },
              ],
              finishReason: "tool-calls",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 20, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          } else if (callCount === 2) {
            return {
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call-2",
                  toolName: "queryDocs",
                  args: JSON.stringify({ libraryId: "/vercel/next.js", query: "routing" }),
                  input: JSON.stringify({ libraryId: "/vercel/next.js", query: "routing" }),
                },
              ],
              finishReason: "tool-calls",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 20, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          } else {
            return {
              content: [{ type: "text", text: "Next.js docs found." }],
              finishReason: "stop",
              usage: {
                inputTokens: { total: 10, cacheWrite: 0, cacheRead: 0 },
                outputTokens: { total: 20, reasoning: 0 },
              },
              rawCall: { rawPrompt: null, rawSettings: {} },
            };
          }
        },
      });

      const agent = new Context7Agent({
        model: mockModel,
        stopWhen: stepCountIs(5),
      });

      const result = await agent.generate({
        prompt:
          "Use resolveLibraryId to search for Next.js, then use queryDocs to get routing documentation",
      });

      expect(result).toBeDefined();

      const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
      const toolNames = allToolCalls.map((call) => call.toolName);

      expect(toolNames).toContain("resolveLibraryId");
      expect(toolNames).toContain("queryDocs");
    });
  });

  describe("Prompt exports", () => {
    test("should export SYSTEM_PROMPT", () => {
      expect(SYSTEM_PROMPT).toBeDefined();
      expect(typeof SYSTEM_PROMPT).toBe("string");
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    test("should export AGENT_PROMPT", () => {
      expect(AGENT_PROMPT).toBeDefined();
      expect(typeof AGENT_PROMPT).toBe("string");
      expect(AGENT_PROMPT).toContain("Context7");
    });

    test("should export RESOLVE_LIBRARY_ID_DESCRIPTION", () => {
      expect(RESOLVE_LIBRARY_ID_DESCRIPTION).toBeDefined();
      expect(typeof RESOLVE_LIBRARY_ID_DESCRIPTION).toBe("string");
      expect(RESOLVE_LIBRARY_ID_DESCRIPTION).toContain("library");
    });
  });
});
