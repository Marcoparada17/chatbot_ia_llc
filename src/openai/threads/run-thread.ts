import OpenAI_Client from '../client/openai-client';
import redis from '../../redis/client';

const ACTIVE_RUN_KEY_PREFIX = 'active_run';

/**
 * Function to create a run for a thread with streaming enabled
 * @param threadId - The thread ID
 * @returns The assistant's response as text
 */
export const createRunForThread = async (threadId: string): Promise<string> => {
  const url = `https://api.openai.com/v1/threads/${threadId}/runs`;
  const method = 'POST';

  const body = {
    assistant_id: process.env.ASSISTANT_ID,
    stream: true,
  };

  try {
    console.log(`Creating run for thread ${threadId}...`);

    // Start the run
    const response = await OpenAI_Client(url, method, body, null, { responseType: 'stream' });

    // Extract the assistant's response
    const assistantResponse = await extractAssistantResponse(response, threadId);

    console.log(`Assistant Response for thread ${threadId}:`, assistantResponse);

    return assistantResponse;
  } catch (error: any) {
    console.error('Error creating run:', error.response?.data || error.message);
    throw new Error('Failed to create run.');
  }
};

/**
 * Extracts and processes the assistant's streaming response
 * @param stream - The streaming response
 * @param threadId - The thread ID
 * @returns The full assistant response as a string
 */
const extractAssistantResponse = (stream: any, threadId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let assistantResponse = ''; // Accumulates the assistant's full response

    console.log('Listening to assistant response stream...');

    stream.on('data', async (chunk: Buffer) => {
      buffer += chunk.toString();

      // Split into lines to process JSON objects individually
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Save any unfinished line

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonString = line.replace('data: ', '').trim();

          if (jsonString === '[DONE]') {
            console.log('Stream completed.');
            await redis.del(`${ACTIVE_RUN_KEY_PREFIX}:${threadId}`);
            resolve(assistantResponse.trim());
            return;
          }

          try {
            const parsedData = JSON.parse(jsonString);

            // Check for "thread.message" with "completed" status
            if (parsedData.object === 'thread.message' && parsedData.status === 'completed') {
              const content = parsedData.content;
              if (content && content[0]?.text?.value) {
                assistantResponse = content[0].text.value;
                console.log('Final Assistant Response:', assistantResponse);
              }
            }
          } catch (e) {
            if (e instanceof Error) {
              console.error('Error parsing streaming line:', e.message);
            } else {
              console.error('Unknown error parsing streaming line:', e);
            }
          }
        }
      }
    });

    stream.on('error', (err: any) => {
      console.error('Stream error:', err.message || err);
      reject(err);
    });

    stream.on('end', async () => {
      console.log('Stream ended.');
      await redis.del(`${ACTIVE_RUN_KEY_PREFIX}:${threadId}`);
      resolve(assistantResponse.trim());
    });
  });
};
