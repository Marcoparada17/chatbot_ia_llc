import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import OpenAI_Client from '../client/openai-client';

export const createTranscription = async (filePath: string): Promise<string> => {
  try {
    // 1. Validate the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // 2. Create a FormData instance
    const form = new FormData();
    form.append('model', 'whisper-1'); // Add the "model" field
    form.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: 'audio/mpeg', // Adjust the content type if needed
    });

    // 3. Create custom config for multipart/form-data
    const config = {
      headers: {
        ...form.getHeaders(), // Automatically sets the correct Content-Type with boundary
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      },
      maxBodyLength: Infinity, // Needed for large files
    };

    // 4. Use your existing OpenAI client
    const response = await OpenAI_Client(
      'https://api.openai.com/v1/audio/transcriptions',
      'POST',
      form, // Pass the FormData instance as body
      null,
      config
    );

    // 5. Return stringified response
    return JSON.stringify(response, null, 2);
  } catch (error: any) {
    console.error('Transcription error:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};