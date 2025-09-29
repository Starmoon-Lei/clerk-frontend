/**
 * Actually Simple Document Processor
 *
 * Does exactly what's needed: Upload → Process → Return data
 * No enterprise theater, no premature optimization
 */

import { OpenAI } from 'openai';

export interface SimpleProcessingResult {
  success: boolean;
  documentType: string;
  confidence: number;
  extractedData: Record<string, unknown>;
  processingTimeMs: number;
  error?: string;
}

export interface SimpleProcessingOptions {
  forceDocumentType?: string;
}

/**
 * Actually simple document processor - does the job in ~50 lines
 */
export class ActuallySimpleDocumentProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Process document: Upload → Extract → Structure → Return
   * No memory monitoring, no smart truncation, no confidence algorithms
   */
  async processDocument(
    file: File,
    options: SimpleProcessingOptions = {}
  ): Promise<SimpleProcessingResult> {
    const startTime = Date.now();
    try {
      // 1. Upload to OpenAI
      const uploadedFile = await this.openai.files.create({
        file: file,
        purpose: 'assistants'
      });

      // 2. Get content
      const contentResponse = await this.openai.files.content(uploadedFile.id);
      const text = await contentResponse.text();

      // 3. Process with AI
      const prompt = options.forceDocumentType
        ? `Extract all data from this ${options.forceDocumentType} document as structured JSON.`
        : `Analyze this document and extract structured data as JSON. Include:
           - documentType: (invoice|receipt|contract|tax_form|other)
           - All relevant data fields from the document`;

      const response = await this.openai.responses.create({
        model: 'gpt-4-turbo-preview',
        input: text,
        instructions: prompt,
        stream: false
      });

      // 4. Parse and return
      let content = '';
      if (Array.isArray(response.output)) {
        // Handle array response format
        content = response.output.map(item =>
          typeof item === 'string' ? item : (item as any)?.content || ''
        ).join('');
      } else {
        content = (response.output as any)?.content || '';
      }

      const result = JSON.parse(content);

      return {
        success: true,
        documentType: result.documentType || options.forceDocumentType || 'unknown',
        confidence: 0.9, // Simple fixed confidence
        extractedData: result.data || result,
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error('Document processing failed:', error);
      return {
        success: false,
        documentType: 'unknown',
        confidence: 0,
        extractedData: {},
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Processing failed'
      };
    }
  }

  /**
   * Stream chat for compatibility with existing chat interface
   */
  async streamChat(
    messages: Array<{ role: string; content: string }>,
    options: { model?: string; webSearch?: boolean; userId?: string } = {}
  ): Promise<ReadableStream> {
    const response = await this.openai.responses.create({
      model: options.model || 'gpt-4-turbo-preview',
      input: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
      stream: true
    });

    const encoder = new TextEncoder();

    return new ReadableStream({
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
            error: error instanceof Error ? error.message : 'Stream failed'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });
  }
}

/**
 * Factory function for creating processor instances
 */
export function createSimpleProcessor(apiKey?: string): ActuallySimpleDocumentProcessor {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key not found');
  }
  return new ActuallySimpleDocumentProcessor(key);
}