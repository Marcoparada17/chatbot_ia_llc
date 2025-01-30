import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import OpenAI_Client from '../client/openai-client'; // Update path as needed
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_KEY = process.env.OPENAI_KEY || '';
/**
 * Uploads "downloaded_image.jpeg" to OpenAI and returns only the file ID.
 */
/**
 * Uploads a local image file to OpenAI's servers and retrieves its file ID.
 * The image must be located at the project root directory as "downloaded_image.jpeg".
 * 
 * @returns Promise that resolves to the OpenAI file ID string
 * @throws Error if file upload fails or if the image file doesn't exist
 * 
 * @example
 * const fileId = await getImageID();
 * console.log(fileId); // "file-abc123"
 * 
 * @remarks
 * The function uses FormData to upload the file with 'vision' purpose to OpenAI's API.
 * The response includes file metadata like ID, size, creation date and filename.
 */
export async function getImageID(downloaded_path: string): Promise<string> {

  // Prepare form data
  const formData = new FormData();
  formData.append('purpose', 'vision');
  formData.append('file', fs.createReadStream(downloaded_path));

  // Merge headers from FormData and include Authorization
  const headers = {
    ...formData.getHeaders(),
    Authorization: `Bearer ${OPENAI_KEY}`,
  };

  // Upload file to OpenAI
  const response = await OpenAI_Client(
    'https://api.openai.com/v1/files',
    'POST',
    formData,
    null,
    {
      headers,
    }
  );

  const { id } = response;
  return id;
}

// Response shape example:
// {
//   "id": "file-abc123",
//   "object": "file",
//   "bytes": 120000,
//   "created_at": 1677610602,
//   "filename": "downloaded_image.jpeg",
//   "purpose": "vision"
// }