import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { BaseMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StructuredToolInterface } from "@langchain/core/tools";
import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { BaseMessageLike } from "@langchain/community/node_modules/@langchain/core/messages";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";

dotenv.config();

// Add constant for wallet data file
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  // No required variables - CDP features are optional
  console.log("Using Ollama at http://localhost:11434");
  
  if (process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY_PRIVATE_KEY) {
    console.log("CDP features enabled");
  } else {
    console.log("CDP features disabled - set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY to enable");
  }
}

// Add this right after imports and before any other code
validateEnvironment();

async function initializeAgent(model = "deepseek-r1:8b", baseUrl = "http://localhost:11434") {
  try {
    // Initialize Ollama LLM with bindTools method
    const ollamaLLM = new ChatOllama({
      model: model,
      baseUrl: baseUrl,
      temperature: 0.7,
    });

    // Add bindTools method to make it compatible with createReactAgent
    const llmWithTools = Object.assign(ollamaLLM, {
      bindTools(tools: any[]) {
        return {
          ...ollamaLLM,
          invoke: async (messages: any[], options?: any) => {
            return ollamaLLM.invoke(messages, options);
          }
        };
      }
    });

    let tools: StructuredToolInterface[] = [];
    let walletProvider = null;

    // Only initialize CDP features if environment variables are present
    if (process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY_PRIVATE_KEY) {
      console.log("Attempting to initialize CDP features...");
      try {
        // Format private key properly
        const rawKey = process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n");
        const keyParts = rawKey.split("\n");
        let formattedKey = "";
        
        if (keyParts.length === 3) {
          // Key is not properly formatted, let's format it
          const keyContent = keyParts[1];
          const chunks = keyContent.match(/.{1,64}/g) || [];
          formattedKey = [
            "-----BEGIN PRIVATE KEY-----",
            ...chunks,
            "-----END PRIVATE KEY-----"
          ].join("\n");
        } else {
          formattedKey = rawKey;
        }

        console.log("Private key format check:", {
          hasBeginMarker: formattedKey.includes("-----BEGIN PRIVATE KEY-----"),
          hasEndMarker: formattedKey.includes("-----END PRIVATE KEY-----"),
          hasLineBreaks: formattedKey.includes("\n"),
          totalLines: formattedKey.split("\n").length,
          averageLineLength: Math.floor(formattedKey.split("\n").reduce((sum, line) => sum + line.length, 0) / formattedKey.split("\n").length)
        });

        const config = {
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: formattedKey,
          networkId: process.env.NETWORK_ID || "base-sepolia",
        };

        // Log config (safely)
        console.log("CDP Config:", {
          apiKeyName: config.apiKeyName,
          networkId: config.networkId,
          privateKeyLength: config.apiKeyPrivateKey?.length || 0,
          // First few chars of private key to verify format
          privateKeyStart: config.apiKeyPrivateKey?.substring(0, 20) + "..."
        });

        try {
          walletProvider = await CdpWalletProvider.configureWithWallet(config);
        } catch (walletError: any) {
          // Log detailed wallet error
          console.error("Wallet initialization error:", {
            error: walletError,
            name: walletError.name,
            message: walletError.message,
            details: walletError.details,
            response: walletError.response,
            stack: walletError.stack
          });
          throw walletError;
        }
        
        // Only set up CDP tools if wallet initialization succeeded
        const agentkit = await AgentKit.from({
          walletProvider,
          actionProviders: [
            wethActionProvider(),
            pythActionProvider(),
            walletActionProvider(),
            erc20ActionProvider(),
            cdpApiActionProvider(config),
            cdpWalletActionProvider(config),
          ],
        });

        tools = await getLangChainTools(agentkit);
        console.log("CDP features initialized successfully");
        console.log("Available tools:", tools.map(tool => ({
          name: tool.name,
          description: tool.description
        })));
      } catch (error) {
        // Type the error properly
        const cdpError = error as Error;
        console.warn("CDP initialization failed, continuing without CDP features:", cdpError.message);
      }
    }

    // Store buffered conversation history
    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "Ollama Chatbot" } };

    // Create React Agent using enhanced Ollama LLM
    const agent = createReactAgent({
      llm: llmWithTools as unknown as BaseChatModel,
      tools,
      checkpointSaver: memory,
      messageModifier: walletProvider 
        ? `You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit.
           
           Available actions:
           1. Wallet Operations:
              - Use 'get_wallet_details' to check wallet address and network
              - Use 'get_balance' to check ETH balance
              - Use 'request_testnet_funds' to get funds from faucet
           
           2. Token Operations:
              - Use 'get_weth_balance' to check WETH balance
              - Use 'wrap_eth' to wrap ETH to WETH
              - Use 'unwrap_weth' to unwrap WETH to ETH
              - Use 'transfer_erc20' for token transfers
           
           3. Price Information:
              - Use 'get_pyth_price' for price feeds
           
           Always start by using 'get_wallet_details' to confirm the network and address.
           For each action, use the exact tool name shown above.
           
           Example: When asked about balance, use the 'get_balance' tool.`
        : `You are a helpful AI assistant. You can engage in conversations and help with various tasks.`,
    });

    return { agent, config: agentConfig, ollamaLLM };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");
      if (userInput.toLowerCase() === "exit") break;
      
      const stream = await agent.stream({ messages: [new HumanMessage(userInput)] }, config);

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
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
    const { agent, config, ollamaLLM } = await initializeAgent();
    await runChatMode(agent, config);
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
