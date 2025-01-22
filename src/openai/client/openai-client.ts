import axios, { AxiosRequestConfig, Method } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_KEY = process.env.OPENAI_KEY || '';
const MAX_RETRIES = 5; // Number of retries

const OpenAI_Client = async (
  url: string,
  method: Method = 'GET',
  body: any = null,
  params: any = null,
  configOverrides: AxiosRequestConfig = {}
) => {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const config: AxiosRequestConfig = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
        data: body,
        params,
        ...configOverrides, // Allow additional config (e.g., responseType: 'stream')
      };

      const response = await axios(config);
      return response.data || response; // Return data or stream
    } catch (error: any) {
      // Check for the "socket hang up" error and retry
      if (
        error.code === 'ECONNRESET' &&
        error.message.includes('socket hang up')
      ) {
        attempt++;
        console.warn(`Retry attempt ${attempt} for URL: ${url}`);
        if (attempt >= MAX_RETRIES) {
          console.error(
            `Failed after ${MAX_RETRIES} attempts for URL: ${url}`
          );
          throw new Error(
            error.response?.data?.error?.message || 'Request failed after retries'
          );
        }
      } else {
        console.error(
          `Open AI Request Error in URL: ${url}`,
          error.response?.data || error.message
        );
        throw new Error(
          error.response?.data?.error?.message || 'Request failed'
        );
      }
    }
  }
};

export default OpenAI_Client;