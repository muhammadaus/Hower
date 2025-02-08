import { ChatOllama } from '@langchain/community/chat_models/ollama';
import type { BaseMessageLike } from "@langchain/community/node_modules/@langchain/core/messages";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config();

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  // Check required variables
  const requiredVars = ["CDP_API_KEY_NAME", "CDP_API_KEY_PRIVATE_KEY"];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Exit if any required variables are missing
  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach(varName => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Warn about optional NETWORK_ID
  if (!process.env.NETWORK_ID) {
    console.warn("Warning: NETWORK_ID not set, defaulting to base-sepolia testnet");
  }
}

// Add this right after imports and before any other code
validateEnvironment();

async function initializeAgent(model = "deepseek-r1:1.5b", baseUrl = "http://localhost:11434") {
  try {
    const llm = new ChatOllama({
      model: model,
      baseUrl: baseUrl,
      temperature: 0.7,
    });

    // Use tuple format: [role, content]
    const messages: BaseMessageLike[] = [
      ["system", "You are a helpful AI assistant"],
      ["human", "Hello, are you working?"]
    ];

    const response = await llm.invoke(messages);
    console.log("Test response:", response.content);
    console.log("Agent initialized successfully");
    return { llm };
  } catch (error: unknown) {
    console.error("Failed to initialize agent:", (error as Error).message);
    throw new Error(`Agent initialization failed: ${(error as Error).message}`);
  }
}

async function runChatMode(llm: ChatOllama) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  try {
    // Use tuple format for messages
    const messages: BaseMessageLike[] = [
      ["system", "You are a helpful AI assistant"]
    ];

    while (true) {
      const userInput = await question("\nPrompt: ");
      if (userInput.toLowerCase() === "exit") break;
      
      messages.push(["human", userInput]);
      const response = await llm.invoke(messages);
      console.log(response.content);
      messages.push(["assistant", response.content]);
      console.log("-------------------");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function main() {
  try {
    const { llm } = await initializeAgent();
    await runChatMode(llm);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  console.log("Starting Chat...");
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
