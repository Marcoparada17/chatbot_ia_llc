import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import fs from 'fs';

dotenv.config(); // Load .env variables

/**
 * Fetches the media URL from Facebook Graph API, downloads the file, and converts it to MP3 if it's audio.
 *
 * @param mediaId - The ID of the media to fetch and download.
 * @param type - The type of media: "audio" or "image".
 * @returns A promise that resolves with the download path of the file.
 */
export async function getAndDownloadMedia(mediaId: string, type: 'audio' | 'image'): Promise<string> {
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

    // Step 2: Determine the file extension based on the type parameter
    let fileExtension: string;
    if (type === 'audio') {
      fileExtension = 'mp3'; // Directly save as MP3
    } else if (type === 'image') {
      fileExtension = 'jpg'; // WhatsApp images are typically JPEG
    } else {
      throw new Error('Invalid type specified. Use "audio" or "image".');
    }

    // Step 3: Download the file
    const downloadPath = path.resolve(process.cwd(), `downloaded_media.${fileExtension}`);

    if (type === 'audio') {
      // Stream the audio directly to ffmpeg for conversion
      const audioStream = await axios.get<Readable>(url, { responseType: 'stream', headers });

      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioStream.data)
          .audioCodec('libmp3lame') // Use MP3 codec
          .audioQuality(2) // Set audio quality (2 is high quality)
          .on('end', () => {
            console.log(`File converted to MP3 and saved to: ${downloadPath}`);
            resolve();
          })
          .on('error', (err:any) => {
            console.error('Error converting audio:', err);
            reject(err);
          })
          .save(downloadPath); // Save the output file
      });
    } else {
      // For images, simply download the file
      const writer = fs.createWriteStream(downloadPath);
      const downloadResponse = await axios.get<Readable>(url, { responseType: 'stream', headers });

      downloadResponse.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`File downloaded successfully to: ${downloadPath}`);
    }

    // Return the download path
    return downloadPath;
  } catch (error: any) {
    console.error('Error fetching, downloading, or converting media:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch, download, or convert media');
  }
}