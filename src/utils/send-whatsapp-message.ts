import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import FormData from 'form-data';
import { insertMessage } from '../db/controllers/message_controller';
import { pushSSEUpdate } from '../router/bot_routes';

dotenv.config();

const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN; // Access token for API

/**
 * Send a WhatsApp message using the Facebook Graph API
 * @param phoneNumberId - The WhatsApp phone number ID
 * @param to - The recipient's phone number
 * @param text - The text message to send
 */
export const sendMessageToWhatsApp = async (phoneNumberId: string, to: string, text: string): Promise<void>  => {
  try {
    // Send the WhatsApp message via the Facebook Graph API
    await axios.post(
      `https://graph.facebook.com/v13.0/${phoneNumberId}/messages?access_token=${WHATSAPP_API_TOKEN}`,
      {
        messaging_product: 'whatsapp',
        to,
        text: {
          body: text,
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Insert the outgoing message into the database
    await insertMessage(to, text, 'text', 'outgoing');

    // // Push the update via SSE
    pushSSEUpdate({
      type: 'NEW_MESSAGE',
      user_id: to,
      message: {
        id: `outgoing-${Date.now()}`, // Unique ID for outgoing messages
        message_body: text,
        direction: 'outgoing',
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`New outgoing message to ${to} pushed via SSE.`);
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a WhatsApp message using the Facebook Graph API
 * @param phoneNumberId - The WhatsApp phone number ID
 * @param to - The recipient's phone number
 * @param image_id - The text message to send
 */
export const sendImageToWhatsApp = async (phoneNumberId: string, to: string, image_id: string) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages?access_token=${WHATSAPP_API_TOKEN}`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: { 
          link: image_id
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log(response.data);
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
};

export const uploadMedia = async (
  phoneNumberId: string,
  path: string,
  mimeType: string = 'image/jpeg'
) => {
  try {
    const fileStream = fs.createReadStream(path);

    // Create form-data and append fields per the curl command:
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', fileStream, {
      filename: path.split('/').pop(),
      contentType: mimeType,
    });

    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        },
      }
    );

    return response.data.id;
  } catch (error: any) {
    console.error(
      'Error uploading media:',
      error.response?.data || error.message
    );
    throw error;
  }
};