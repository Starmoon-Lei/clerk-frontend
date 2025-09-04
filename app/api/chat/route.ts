import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createMCPTools, defaultMCPServer } from '../../../lib/mcp/client';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    model,
    webSearch,
  }: { messages: UIMessage[]; model: string; webSearch: boolean } =
    await req.json();

  let mcpCleanup: (() => Promise<void>) | null = null;

  try {

    // Create MCP tools using the new client
    const { tools: mcpTools, cleanup } = await createMCPTools([defaultMCPServer]);
    mcpCleanup = cleanup;

    const result = streamText({
      model: openai(process.env.OPENAI_MODEL as string),
      messages: convertToModelMessages(messages),
      system: 'You are a helpful assistant that can answer questions and help with tasks',
      tools: mcpTools,
      onFinish: async () => {
        if (mcpCleanup) {
          await mcpCleanup();
        }
      },
      onError: async (error) => {
        console.error('Error in streamText:', error);
        if (mcpCleanup) {
          await mcpCleanup();
        }
      },
    });

    // send sources and reasoning back to the client
    return result.toUIMessageStreamResponse({
      sendSources: true,
      sendReasoning: true,
    });
  } catch (error) {
    console.error('Error setting up MCP tools:', error);
    if (mcpCleanup) {
      await mcpCleanup();
    }
    throw error;
  }
}