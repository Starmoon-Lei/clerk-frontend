import OpenAI from 'openai';
import { auth } from "../../../auth";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized. Please sign in to access this resource.' 
      }, { status: 401 });
    }

    const { messages, webSearch } = await req.json();
    console.log("messages", messages);

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL as string,
      stream: true,
      input: messages.map((msg: { role: string; content: string | unknown[] }) => ({
        role: msg.role,
        content: Array.isArray(msg.content) 
          ? msg.content 
          : String(msg.content || (msg as { text?: string }).text || '')
      })),
      instructions: `You are a helpful assistant that can answer questions, help with tasks, and access various tools through MCP servers. 

The current user ID is: ${session.user.id}. All data operations should be scoped to this user for privacy and security.

When using tools:
- Be thorough and explain your reasoning
- Show your thinking process step by step
- Provide clear explanations of what you're doing
- Always ensure data operations are user-specific

Always look at the latest files and information available to you before answering. You must not reveal any id-related information.    
Respond naturally and conversationally while being informative. You should always summarise your response in a few sentences. Keep your response concise and to the point. ultrathink`,
      tools: [
        {
          type: 'mcp',
          server_label: 'mcp',
          server_description: 'A MCP server to assist with document analysis and client management.',
          server_url: 'https://mcp-server-jet.vercel.app/mcp',
          require_approval: webSearch ? 'always' : 'never',
          // Pass user context to MCP server
          context: { userId: session.user.id }
        },
      ],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (error) {
          console.error('Stream error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { approved } = await req.json();
    
    // TODO: Implement tool approval once OpenAI SDK supports it
    console.log('Tool approval request:', approved);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Tool approval error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}