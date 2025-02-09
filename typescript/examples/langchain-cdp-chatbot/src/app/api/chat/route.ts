import { NextResponse } from 'next/server';
import { initializeAgent } from '@/services/chatbot';
import { HumanMessage } from "@langchain/core/messages";
import { StorageService } from '@/lib/storage';

export async function POST(request: Request) {
  console.log('API: Starting chat request...');
  
  try {
    const body = await request.json();
    console.log('API: Received message:', body);

    console.log('API: Initializing agent...');
    const { agent, config } = await initializeAgent();
    console.log('API: Agent initialized successfully');

    console.log('API: Invoking agent with message...');
    const response = await agent.invoke({
      messages: [new HumanMessage(body.message)]
    }, config);
    console.log('API: Agent response:', response);

    // Extract the actual response content
    const aiMessage = response.messages[response.messages.length - 1];
    const content = aiMessage.content;

    // Check if there are any tool calls to execute
    if (aiMessage.tool_calls?.length > 0) {
      for (const toolCall of aiMessage.tool_calls) {
        if (toolCall.name === 'schedule_task') {
          const args = JSON.parse(toolCall.arguments);
          const storage = StorageService.getInstance();
          await storage.addTimeBlock({
            _id: crypto.randomUUID(),
            title: args.title || "High-Priority Meeting",
            startTime: new Date(args.startTime || body.message).toISOString(),
            endTime: new Date(new Date(args.startTime || body.message).getTime() + 60 * 60 * 1000).toISOString(),
            priority: args.priority || "urgent-important",
            delegatable: args.delegatable || false,
            status: 'scheduled',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      response: content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      details: error.details || 'No additional details'
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
} 