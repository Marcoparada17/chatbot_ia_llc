import OpenAI_Client from "../client/openai-client";

// Function to add a message (with optional image) to an existing thread
/**
 * Adds a message to an OpenAI thread, optionally including an image file.
 * 
 * @param threadId - The ID of the thread to add the message to
 * @param message - The text content of the message to be added
 * @param file_id - Optional. The ID of an image file to attach to the message
 * 
 * @returns Promise containing the response from the OpenAI API with the created message
 * 
 * @throws Will throw an error if the API request fails
 * 
 * @example
 * // Add a text-only message
 * const response = await addMessageToThread("thread_123", "Hello world");
 * 
 * // Add a message with an image
 * const response = await addMessageToThread("thread_123", "Check this image", "file_abc");
 */
export const addMessageToThread = async (
  threadId: string,
  message: string,
  file_id?: string | null
) => {
  const url = `https://api.openai.com/v1/threads/${threadId}/messages`;
  const method = 'POST';

  // Dynamically construct the content array
  const content = [];

  if (file_id) {
    content.push({
      type: 'image_file',
      image_file: { file_id },
    });
  }

  content.push({
    type: 'text',
    text: message,
  });

  const body = {
    role: 'user',
    content,
  };

  try {
    const response = await OpenAI_Client(url, method, body);
    console.log('Message Added to Thread:', response);
    return response; // Returns the message object
  } catch (error: any) {
    console.error('Error adding message to thread:', error.message);
    throw error;
  }
};
