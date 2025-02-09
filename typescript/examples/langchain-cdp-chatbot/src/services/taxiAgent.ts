import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StructuredToolInterface } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { encrypt } from '@/lib/crypto';

interface TaxiRequest {
  pickup: string;
  destination: string;
  time: string;
  paymentAmount: number;
  cryptoAddress: string;
}

export class TaxiAgent {
  private static instance: TaxiAgent;
  private paymentAddress: string = "0x123..."; // Default payment address
  private readonly basePrice = 0.001; // ETH
  private readonly pricePerKm = 0.0001; // ETH

  private constructor() {}

  static getInstance(): TaxiAgent {
    if (!TaxiAgent.instance) {
      TaxiAgent.instance = new TaxiAgent();
    }
    return TaxiAgent.instance;
  }

  async initializeAgent() {
    try {
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY is not set in environment variables');
      }

      const tools: StructuredToolInterface[] = [
        {
          name: 'calculate_fare',
          description: 'Calculate taxi fare for the journey',
          func: async ({ pickup, destination }) => {
            // Mock distance calculation
            const distance = Math.random() * 20 + 5; // 5-25km
            const fare = this.basePrice + (this.pricePerKm * distance);
            return {
              distance: Math.round(distance * 100) / 100,
              fare: Math.round(fare * 1000000) / 1000000,
              currency: 'ETH'
            };
          },
        },
        {
          name: 'verify_payment',
          description: 'Verify crypto payment for the ride',
          func: async ({ amount, address }) => {
            // Mock payment verification
            const verified = Math.random() > 0.1; // 90% success rate
            if (verified) {
              return {
                status: 'confirmed',
                txHash: `0x${Math.random().toString(16).substr(2, 40)}`,
                timestamp: new Date().toISOString()
              };
            }
            throw new Error('Payment verification failed');
          },
        },
        {
          name: 'book_ride',
          description: 'Book a taxi ride',
          func: async (request: TaxiRequest) => {
            const payment = await this.verifyPayment(request.paymentAmount, request.cryptoAddress);
            if (payment.status === 'confirmed') {
              // Store encrypted booking details
              const encryptedBooking = encrypt(JSON.stringify({
                ...request,
                paymentTxHash: payment.txHash,
                bookingTime: new Date().toISOString()
              }));
              
              return {
                status: 'booked',
                bookingId: `TAXI-${Math.random().toString(16).substr(2, 8).toUpperCase()}`,
                estimatedArrival: new Date(Date.now() + 10 * 60000).toISOString(),
                paymentConfirmation: payment
              };
            }
            throw new Error('Booking failed - payment required');
          },
        }
      ];

      // Initialize Gemini Chat model
      const llm = new ChatGoogleGenerativeAI({
        modelName: "gemini-pro",
        maxOutputTokens: 2048,
        temperature: 0.7,
        apiKey: process.env.GOOGLE_API_KEY,
      });

      // Add bindTools method to LLM
      const llmWithTools = Object.assign(llm, {
        bindTools(tools: any[]) {
          return {
            ...llm,
            invoke: async (messages: any[], options?: any) => {
              return llm.invoke(messages, options);
            }
          };
        }
      });

      const memory = new MemorySaver();

      const agent = createReactAgent({
        llm: llmWithTools as unknown as BaseChatModel,
        tools,
        checkpointSaver: memory,
        messageModifier: `You are a professional taxi service agent. You help customers book rides and handle crypto payments.
          Always be polite and professional. Ask for pickup location, destination, and preferred time.
          Explain the fare calculation and payment process clearly.
          The fare must be paid in ETH to address ${this.paymentAddress}.
          After payment confirmation, provide booking details and estimated arrival time.
          Never break character - you are a real taxi service.
          
          When calculating fares:
          1. Base price is ${this.basePrice} ETH
          2. Price per km is ${this.pricePerKm} ETH
          3. Always verify payment before confirming booking
          4. Provide clear instructions for crypto payment
          
          Remember to:
          - Ask for all necessary details if not provided
          - Explain any payment failures clearly
          - Provide estimated arrival times
          - Be patient with customers new to crypto payments`
      });

      return { agent, config: { configurable: { thread_id: "Taxi Service" } } };
    } catch (error) {
      console.error('Error initializing agent:', error);
      throw error;
    }
  }

  private async verifyPayment(amount: number, address: string) {
    // Mock payment verification
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate blockchain check
    return {
      status: 'confirmed',
      txHash: `0x${Math.random().toString(16).substr(2, 40)}`,
      timestamp: new Date().toISOString()
    };
  }

  setPaymentAddress(address: string) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address');
    }
    this.paymentAddress = address;
  }
} 