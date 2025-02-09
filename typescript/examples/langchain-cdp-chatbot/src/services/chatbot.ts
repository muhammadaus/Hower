import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TaxiService } from './taxiService';

export async function initializeAgent() {
  try {
    console.log('Initializing Google AI...');
    
    // Create the model
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      modelName: "gemini-pro",
      temperature: 0.7,
    });

    // Create a prompt template with specific format instructions
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are a helpful assistant that schedules events and handles transportation. Format your responses clearly:

      1. First confirm the event details:
         \`\`\`
         schedule_task(
           title="[title]",
           startTime="YYYY-MM-DDTHH:mm:ss",
           endTime="YYYY-MM-DDTHH:mm:ss",
           priority="[priority]",
           location="[location]",
           needsTransport=[true/false]
         )
         \`\`\`

      2. If transport is needed:
         \`\`\`
         book_taxi(
           pickup="[location]",
           destination="[location]",
           pickupTime="HH:mm"
         )
         \`\`\`

      3. After booking, verify payment:
         \`\`\`
         verify_payment(txHash="[hash]")
         \`\`\`

      Respond in this format:
      📅 Event Scheduled: [title]
      ⏰ Time: [start] - [end]
      📍 Location: [location]
      🚕 Transport: [details if needed]
      💰 Payment: [status]
      
      Keep responses concise and well-formatted.
      For times, you can use either ISO format (YYYY-MM-DDTHH:mm:ss) or 12-hour format (HH:mm AM/PM).`],
      ["human", "{input}"]
    ]);

    // Create function handlers
    const functionHandlers = {
      async book_taxi(params: any) {
        const taxiService = TaxiService.getInstance();
        const paymentDetails = await taxiService.getPaymentDetails(
          params.pickup,
          params.destination
        );
        return paymentDetails;
      },
      async verify_payment(params: any) {
        const taxiService = TaxiService.getInstance();
        const verified = await taxiService.verifyPayment(params.txHash);
        return verified;
      }
    };

    console.log('Google AI initialized');

    return {
      agent: model,
      prompt,
      functionHandlers,
      config: {}
    };
  } catch (error) {
    console.error('Error initializing agent:', error);
    throw error;
  }
}