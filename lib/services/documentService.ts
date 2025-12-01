/**
 * Ultra-minimal business document processing
 */

import { OpenAI } from 'openai';

/**
 * Process business document: upload → extract → return
 */
export async function processBusinessDocument(file: File) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const startTime = Date.now();

  const uploadedFile = await openai.files.create({ file, purpose: 'user_data', expires_after: {
    anchor: 'created_at',
    seconds: 15 * 24 * 60 * 60
  } });
  const uploadFinishTime = Date.now();

  const response = await openai.responses.create({
    model: 'gpt-5-mini-20250807',
    input: [
      {
          role: "user",
          content: [
              {
                  type: "input_file",
                  file_id: uploadedFile.id,
              }
          ],
      },
  ],
    instructions: 'Extract key business data as JSON: {documentType, totalAmount, vendor, date, dueDate}',
    stream: false
  });
  const responseFinishTime = Date.now();


  // Extract content from response
  let responseContent = '';
  if (Array.isArray(response.output)) {
    responseContent = response.output.map(item =>
      typeof item === 'string' ? item : (item as { content?: string })?.content || ''
    ).join('');
  } else {
    responseContent = (response.output as { content?: string })?.content || '';
  }

  const content = JSON.parse(responseContent);
  const uploadTime = uploadFinishTime - startTime;
  const responseTime = responseFinishTime - uploadFinishTime;
  return {content, uploadTime, responseTime};
}

/**
 * Process multiple files sequentially
 * No concurrency complexity for 1-3 business files
 */
export async function processFiles(files: File[]) {
  const results = [];
  for (const file of files) {
    try {
      const data = await processBusinessDocument(file);
      results.push({
        fileName: file.name,
        fileSize: file.size,
        success: true,
        documentType: data.content.documentType || 'unknown',
        extractedData: data.content,
        confidence: data.content.confidence,
        processingTimeMs: data.uploadTime + data.responseTime
      });
    } catch (error) {
      results.push({
        fileName: file.name,
        fileSize: file.size,
        success: false,
        documentType: 'unknown',
        extractedData: {},
        confidence: 0,
        processingTimeMs: null,
        error: error instanceof Error ? error.message : 'Processing failed'
      });
    }
  }
  return results;
}

/**
 * Simple chat for business Q&A
 * No streaming, no complexity
 */
export async function businessChat(messages: Array<{role: string; content: string}>) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.responses.create({
    model: 'gpt-5-mini-20250807',
    input: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
    stream: false
  });

  // Extract content from response
  let responseContent = '';
  if (Array.isArray(response.output)) {
    responseContent = response.output.map(item =>
      typeof item === 'string' ? item : (item as { content?: string })?.content || ''
    ).join('');
  } else {
    responseContent = (response.output as { content?: string })?.content || '';
  }

  return { content: responseContent };
}