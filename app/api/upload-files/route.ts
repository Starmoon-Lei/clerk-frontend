import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    validateFiles(files);

    const result = await uploadToOpenAI(files);

    return NextResponse.json({
      success: result
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload files' 
      },
      { status: 500 }
    );
  }
}

/**
 * Upload files to OpenAI with single request
 */
async function uploadToOpenAI(files: File[]) {
  const uploadPromises = files.map(async (file) => {
    const response = await openai.files.create({
      file: file,
      purpose: 'user_data',
    });
    
    // validate the file is uploaded
    if (!response || !response.id) {
      console.error('Failed to upload file to OpenAI');
      throw new Error('Failed to upload file to OpenAI');
    }

    return {
      originalFileName: file.name,
      openaiFile: response
    };
  });

  const results = await Promise.all(uploadPromises);

  const input = results.map(r => ({
    type: "input_file" as const, 
    file_id: r.openaiFile.id as string
  }));

  const chatResponse = await openai.responses.create({
    model: process.env.OPENAI_MODEL as string,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "12312" },
          ...input,
        ]
      },
    ],
    instructions: `
You are a helpful assistant that analyzes the files to extract the profile information and store it in the MCP server. You will also fetch the clients involved in each profile and update the clients summary based on the extracted information.

Your response MUST include a JSON array with the following schema:
[
  { "client": "A", "file_id": "1", "summaryUpdated": true },
  { "client": "B", "file_id": "2", "summaryUpdated": true }
]
where "client" is the name or identifier of the client extracted from the file, and "file_id" is the OpenAI file id associated with that client. Return this array as part of your response.
    `.trim(),
    tools: [
      {
        type: "mcp",
        server_label: "mcp",
        server_description: "A mcp server to assist with document analysis.",
        server_url: "https://mcp-server-jet.vercel.app/mcp",
        require_approval: "never",
      },
    ],
  });

  if (!chatResponse || !chatResponse.output) {
    console.error('Failed to get chat response from OpenAI');
    throw new Error('Failed to get chat response from OpenAI');
  }

  console.log("chatResponse.output", chatResponse.output);

  return true;
}

/**
 * Validate files including file type, file size, file name
 */
function validateFiles(files: File[]) {
  
  files.forEach(file => {
    if (file.type !== 'application/pdf' && file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'text/plain' && file.type !== 'docx' && file.type !== 'doc' && file.type !== 'txt') {
      throw new Error('File type is not allowed');
    }
    if (file.size === 0) {
      throw new Error('File is empty');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size is too large');
    }
    if (file.name.length > 255) {
      throw new Error('File name is too long');
    }
    if (!/^[a-zA-Z0-9\s._-]+$/.test(file.name)) {
      throw new Error('File name contains illegal characters');
    }
  });
}