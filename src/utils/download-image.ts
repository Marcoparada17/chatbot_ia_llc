import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

/**
 * Fetches the media URL from Facebook Graph API and downloads the file.
 *
 * @param mediaId - The ID of the media to fetch and download.
 * @returns A promise that resolves when the image is downloaded.
 */
export async function getAndDownloadMedia(mediaId: string): Promise<void> {
  const token = process.env.WHATSAPP_API_TOKEN || '';
  if (!token) {
    throw new Error('WHATSAPP_API_TOKEN is missing in .env');
  }

  // Step 1: Fetch the media URL
  const graphApiUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await axios.get(graphApiUrl, { headers });
    const { url, mime_type } = response.data;

    if (!url) {
      throw new Error('Media URL not found in the response');
    }

    console.log(`Fetched media URL: ${url}`);
    console.log(`Media type: ${mime_type}`);

    // Step 2: Download the file
    const downloadPath = path.resolve(process.cwd(), 'downloaded_image.jpeg'); // File saved in root as downloaded_image.jpeg
    const writer = fs.createWriteStream(downloadPath);

    const downloadResponse = await axios.get(url, {
      responseType: 'stream',
      headers,
    });

    downloadResponse.data.pipe(writer);

    // Handle download completion
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`File downloaded successfully to: ${downloadPath}`);
  } catch (error: any) {
    console.error('Error fetching or downloading media:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch or download media');
  }
}
