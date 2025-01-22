import OpenAI_Client from '../client/openai-client';

/**
 * Function to check if a run is active for the given thread
 * @param threadId - The OpenAI thread ID
 * @returns Active run if found, else null
 */
export const checkRunStatus = async (threadId: string): Promise<any | null> => {
  const url = `https://api.openai.com/v1/threads/${threadId}/runs`;
  const method = 'GET';

  try {
    const response = await OpenAI_Client(url, method);
    const runs = response?.data || [];

    // Check if any run is still active
    const activeRun = runs.find(
      (run: any) => run.status === 'in_progress' || run.status === 'queued'
    );

    return activeRun || null;
  } catch (error: any) {
    console.error('Error checking run status:', error.message);
    throw error;
  }
};
