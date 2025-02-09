import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
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
import { StorageService } from '@/lib/storage';
import { TaxiAgent } from './taxiAgent';

export async function initializeAgent(model = "deepseek-r1:8b", baseUrl = "http://localhost:11434") {
  console.log('Chatbot: Starting agent initialization...');
  
  try {
    console.log('Chatbot: Configuring Ollama LLM...');
    const ollamaLLM = new ChatOllama({
      model: model,
      baseUrl: baseUrl,
      temperature: 0.7,
    });
    console.log('Chatbot: Ollama LLM configured');

    // Add bindTools method
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

    // Initialize CDP features if env vars present
    if (process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY_PRIVATE_KEY) {
      console.log('Chatbot: CDP credentials found, initializing CDP features...');
      try {
        const config = {
          apiKeyName: process.env.CDP_API_KEY_NAME,
          networkId: process.env.NETWORK_ID || "base-sepolia",
          // Log redacted version of private key
          privateKeyLength: process.env.CDP_API_KEY_PRIVATE_KEY?.length
        };
        console.log('Chatbot: CDP config:', config);

        console.log('Chatbot: Configuring CDP wallet...');
        walletProvider = await CdpWalletProvider.configureWithWallet({
          apiKeyName: config.apiKeyName,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          networkId: config.networkId,
        });
        console.log('Chatbot: CDP wallet configured successfully');

        console.log('Chatbot: Initializing AgentKit...');
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
        console.log('Chatbot: AgentKit initialized');

        tools = await getLangChainTools(agentkit);
        console.log('Chatbot: Tools configured:', tools.map(t => t.name));
      } catch (error) {
        console.error('Chatbot: CDP initialization failed:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          details: error.details || 'No additional details'
        });
      }
    } else {
      console.log('Chatbot: No CDP credentials found, skipping CDP features');
    }

    // Add scheduling tools
    const schedulingTools = [
      {
        name: 'check_calendar',
        description: 'Check available time slots in calendar',
        func: async () => {
          const storage = StorageService.getInstance();
          return storage.getTimeBlocks();
        },
      },
      {
        name: 'schedule_task',
        description: 'Schedule a new task in calendar. Use this when user wants to add events or meetings.',
        func: async ({ title, startTime, endTime, priority, delegatable, maxBudget }) => {
          console.log('Scheduling task:', { title, startTime, endTime, priority });
          const storage = StorageService.getInstance();
          const block = {
            _id: crypto.randomUUID(),
            title: title || "Untitled Event",
            startTime: new Date(startTime).toISOString(),
            endTime: endTime ? new Date(endTime).toISOString() : 
              new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
            priority: priority || "important",
            delegatable: delegatable || false,
            maxBudget: maxBudget,
            status: 'scheduled',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          storage.addTimeBlock(block);
          return {
            success: true,
            message: `Successfully scheduled "${block.title}" for ${new Date(block.startTime).toLocaleString()}`,
            block
          };
        },
      },
      // Add more tools for delegation
    ];

    tools = [...tools, ...schedulingTools];

    // Initialize taxi service
    console.log('Chatbot: Initializing taxi service...');
    const taxiAgent = TaxiAgent.getInstance();
    const { agent: taxiAgentInstance } = await taxiAgent.initializeAgent(model);

    // Add taxi service tools
    const taxiTools = [
      {
        name: 'request_taxi',
        description: 'Request a taxi service with crypto payment',
        func: async ({ pickup, destination, time }) => {
          // Calculate fare first
          const fareResult = await taxiAgentInstance.invoke({
            messages: [{ role: 'user', content: `Calculate fare from ${pickup} to ${destination}` }]
          });
          
          // Book the ride
          const bookingResult = await taxiAgentInstance.invoke({
            messages: [{ 
              role: 'user', 
              content: `Book ride from ${pickup} to ${destination} at ${time} with payment confirmation` 
            }]
          });

          return {
            fare: fareResult,
            booking: bookingResult
          };
        }
      }
    ];

    tools = [...tools, ...taxiTools];

    // Update message modifier to include taxi service
    const messageModifier = walletProvider 
      ? `You are a helpful agent that can interact onchain using CDP and help with taxi bookings.
         For taxi requests, you can calculate fares and book rides with crypto payments.
         Always verify payment before confirming bookings.`
      : `You are a helpful AI assistant that can help with taxi bookings.
         You can calculate fares and arrange rides with crypto payments.`;

    const memory = new MemorySaver();
    const agentConfig = { configurable: { thread_id: "Ollama Chatbot" } };

    console.log('Chatbot: Creating React Agent...');
    const agent = createReactAgent({
      llm: llmWithTools as unknown as BaseChatModel,
      tools,
      checkpointSaver: memory,
      messageModifier: messageModifier,
    });
    console.log('Chatbot: React Agent created successfully');

    return { agent, config: agentConfig };
  } catch (error) {
    console.error('Chatbot: Agent initialization failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      details: error.details || 'No additional details'
    });
    throw error;
  }
} 