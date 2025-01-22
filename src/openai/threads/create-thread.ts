import redis from '../../redis/client';
import OpenAI_Client from '../client/openai-client';
import dotenv from 'dotenv';

dotenv.config();

const THREAD_TTL = parseInt(process.env.THREAD_TTL || '1800'); // 30 minutes

/**
 * Function to get or create a new thread for a user
 * @param userId - Unique identifier for the user
 * @returns Thread ID
 */
export const createThread = async (userId: string): Promise<string> => {
  const redisKey = `thread:${userId}`;

  try {
    // Check if thread already exists in Redis
    let threadId: string | null = await redis.get(redisKey);

    if (threadId) {
      console.log(`Thread found in Redis for user ${userId}: ${threadId}`);
      return threadId; // Return existing thread ID
    }

    // If threadId is null, create a new thread using OpenAI API
    console.log('No thread found in Redis. Creating a new thread...');
    const url = 'https://api.openai.com/v1/threads';
    const method = 'POST';

    const response = await OpenAI_Client(url, method);
    threadId = response.id as string; // Explicit assertion to string

    // Store the new thread in Redis with a 30-minute expiration
    await redis.setex(redisKey, THREAD_TTL, threadId);
    console.log(`New thread created and stored in Redis for user ${userId}: ${threadId}`);

    return threadId;
  } catch (error: any) {
    console.error('Error creating or fetching thread:', error.message);
    throw new Error('Failed to create or retrieve thread');
  }
};
