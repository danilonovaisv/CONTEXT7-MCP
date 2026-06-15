import { resolveLibraryId } from "./dist/index.js";

async function main() {
  const toolInstance = resolveLibraryId({ apiKey: "ctx7sk-dummy" });
  try {
    console.log("Executing tool...");
    const result = await toolInstance.execute(
      { query: "Search for 'react' library", libraryName: "react" },
      { toolCallId: "call-1", messages: [] }
    );
    console.log("TOOL EXECUTION SUCCESS:", result);
  } catch (err) {
    console.error("TOOL EXECUTION FAILED:", err.stack || err);
  }
}

main();
