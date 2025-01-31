import { Request, Response, Router } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createRunForThread } from '../openai/threads/run-thread';
import { addMessageToThread } from '../openai/threads/add-message';
import { createThread } from '../openai/threads/create-thread';
import redis from '../redis/client';
import { authorize } from '../google-calendar/client';
import { checkAndSuggestTimes, findFreeTimes, findFreeTimesOnDate } from '../google-calendar/find-available-times';
import { parseStartToTimeSlot } from '../utils/parse-date';
import { bookEvent } from '../google-calendar/book-event';
import { getNextWeekday } from '../utils/get-week-day';
import { normalizedDate } from '../openai/format-date/format-date';
import { sendImageToWhatsApp, sendMessageToWhatsApp } from '../utils/send-whatsapp-message';
import { getAndDownloadMedia } from '../utils/download-image';
import { getImageID } from '../openai/upload-image/upload-image';
import { getAllUsers, getMessagesByUser, insertClosedClient, insertMessage, insertOrUpdateUser } from '../db/controllers/message_controller';
import { SendMessageBody } from '../types/types';
import { createTranscription } from '../openai/transcript/transcript';

dotenv.config();

const router = Router();
const messageBuffer: { [key: string]: string } = {};

// Environment variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Token for webhook verification
// Webhook message listener (POST)
const ACTIVE_RUN_KEY_PREFIX = 'active_run';
const PROCESSED_MESSAGES_KEY_PREFIX = 'processed_message';
const TIMER_KEYS_PREFIX = 'user:timer';
const INITIATED_KEY_PREFIX = 'flow:initiated';
const BLACKLIST_KEY_PREFIX = 'blacklist';

const MESSAGE_FLOW = [
  {
    delay: 300, // 5 minutes
    message: "Tenemos atención en las ciudades de Bogotá, Barranquilla, Medellín, Cartagena y Bucaramanga ¿Cuál es la más conveniente para ti?",
  },
  {
    delay: 600, // 10 minutes
    message: `Mira te comparto la info... La Otoplastia es un procedimiento que busca corregir la forma, tamaño o posición de las orejas.

Se realiza para mejorar la apariencia estética o corregir anomalías congénitas (de nacimiento). Durante el procedimiento, se hace una pequeña incisión en la parte posterior de la oreja y se remodela el cartílago auricular para lograr el resultado deseado.

La recuperación suele ser rápida, pero es esencial seguir las indicaciones médicas para obtener los mejores resultados.
La duración del procedimiento es de 1 hora y media aproximadamente bajo anestesia local. El valor de la otoplastia es de $2.600.000. Sin embargo, este mes contamos con una promoción de 10% de descuento, por lo que el costo es de $2.300.000. Este valor incluye el kit de medicamentos, el kit de curación, el vendaje y la cita de revisión postoperatoria. ¿Te gustaría agendar una consulta virtual con la Dra. Ana? ¿Tienes alguna duda?`,
  },
  {
    delay: 86400, // 24 hours
    message: "Hola! ayer te contactaste para la promo de Otoplastia. Te tengo en el sistema, pero para poder aplicar la promoción debemos agendar la valoración. ¿Cuéntame si te interesa o qué duda tienes?",
  },
];

let sseClient: Response | null = null; // Explicitly define the type of sseClient

// SSE endpoint
router.get('/sse', async (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Prevent connection timeout
  req.socket.setTimeout(0);

  // Store the response object for later use
  sseClient = res;

  // Send an initial connection message
  res.write(`data: ${JSON.stringify({ message: 'SSE connection established' })}\n\n`);

  // Handle client disconnection
  req.on('close', () => {
    console.log('SSE client disconnected');
    sseClient = null;
  });
});

export function pushSSEUpdate(data: Record<string, any>): void {
  if (sseClient) {
    sseClient.write(`data: ${JSON.stringify(data)}\n\n`);
  } else {
    console.log('No SSE client connected to receive updates');
  }
}



/**
 * POST /sendMessage
 * Send a WhatsApp message using the "to" and "message" fields from the request body
 */
router.post('/sendMessage', async (req: Request, res: Response): Promise<void> => {
  // Option A: Use a type assertion if the rest of your code is happy without generics
  const { to, message } = req.body as SendMessageBody;

  // Validate input
  if (!to || !message) {
    // 2) Send the response and then end the function
    res.status(400).json({ error: 'Both "to" and "message" are required.' });
    return; // Returns void
  }

  try {
    // Call the sendMessageToWhatsApp function
    await sendMessageToWhatsApp("553009727891597", to, message);

    // Send success response
    res.status(200).json({ message: 'Message sent successfully.' });
    return; // Returns void
  } catch (error: any) {
    console.error('Error sending message:', error.message || error);
    res.status(500).json({ error: 'Failed to send message.' });
    return; // Returns void
  }
});


// Simulate sending a message via SSE
// router.post('/simulate-message', (req: Request, res: Response): void => {
//   const newMessage = {
//     user_id: 'user_123',
//     message_body: 'Hello, this is a test message',
//     timestamp: Date.now(),
//     type: 'NEW_MESSAGE',
//   };

//   // Push the new message to the SSE client
//   pushSSEUpdate(newMessage);

//   res.status(200).send('Message pushed to SSE');
// });


const setTimer = async (user: string, step: number) => {
  const { delay, message } = MESSAGE_FLOW[step];
  const timerKey = `${TIMER_KEYS_PREFIX}:${user}`;

  console.log(`Setting timer for user: ${user}, step: ${step}, delay: ${delay}s`);

  // Store the current step in Redis with an expiration
  await redis.setex(timerKey, delay + 60, `${step}`);

  // Schedule message sending
  setTimeout(async () => {
    console.log(`Checking timer for user: ${user}, step: ${step}`);

    const currentStep = await redis.get(timerKey);
    console.log(`Redis value for user ${user}, step ${step}: ${currentStep}`);

    // Check if the timer is still valid for this step
    if (currentStep === `${step}`) {
      console.log(`Sending message to user: ${user}, step: ${step}`);

      const phoneNumberId = await redis.get(`${TIMER_KEYS_PREFIX}:${user}:phone`);
      if (phoneNumberId) {
        await sendMessageToWhatsApp(phoneNumberId, user, message);
        console.log(`Message sent to user ${user}: ${message}`);

        // Move to the next step if there is one
        if (step + 1 < MESSAGE_FLOW.length) {
          await setTimer(user, step + 1);
        }
      } else {
        console.error(`Phone number not found for user ${user}`);
      }
    } else {
      console.log(`Timer expired or overridden for user ${user}, step ${step}`);
    }
  }, delay * 1000);
};


// Get all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers(); // existing DB call

    // For each user, check Redis to see if they are blacklisted
    for (const user of users) {
      const blacklisted = await redis.get(`${BLACKLIST_KEY_PREFIX}:${user.user_id}`);
      user.luna_active = !blacklisted; // true if not blacklisted, false if blacklisted
    }

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Get messages for a specific user
router.get('/users/:user_id/messages', async (req: Request, res: Response) => {
  const { user_id } = req.params;

  try {
    const messages = await getMessagesByUser(user_id);
    res.status(200).json(messages);
  } catch (error) {
    console.error(`Error fetching messages for user ${user_id}:`, error);
    res.status(500).send('Internal Server Error');
  }
});

// Webhook verification route (GET)
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const token = req.query['hub.verify_token'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully.');
      res.status(200).send(challenge);
    } else {
      console.error('Verification token mismatch.');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400); // Bad Request if parameters are missing
  }
});


/**
 * POST /blacklist
 * Add user to blacklist ("stop Luna")
 */
router.post('/blacklist', async (req: Request, res: Response) => {
  const { user_id } = req.body;

  if (!user_id) {
    res.status(400).json({ message: '"user_id" is required.' });
    return; // Stop execution
  }

  try {
    // Mark the user as blacklisted
    await redis.set(`${BLACKLIST_KEY_PREFIX}:${user_id}`, 'true');
    console.log(`User ${user_id} blacklisted (Luna stopped).`);

    // Optionally push an SSE event
    pushSSEUpdate({
      type: 'STOP_LUNA',
      user_id,
    });

    res.status(200).json({
      message: `User ${user_id} has been blacklisted (Luna stopped).`,
    });
  } catch (error: any) {
    console.error('Error blacklisting user:', error.message);
    res.status(500).json({ message: 'Failed to blacklist user.' });
  }
})

/**
 * DELETE /blacklist/:user_id
 * Remove user from blacklist
 */
router.delete('/blacklist/:user_id', async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    res.status(400).json({ message: '"user_id" is required in params.' });
    return; // Stop execution
  }

  try {
    // Remove from blacklist
    const isRemoved = await redis.del(`${BLACKLIST_KEY_PREFIX}:${user_id}`);
    if (isRemoved === 0) {
      // If the key didn't exist
      res.status(404).json({ message: `User ${user_id} is not in the blacklist.` });
      return;
    }

    console.log(`User ${user_id} removed from blacklist (Luna restarted).`);

    // Optionally push an SSE event
    pushSSEUpdate({
      type: 'START_LUNA',
      user_id,
    });

    res.status(200).json({
      message: `User ${user_id} has been removed from blacklist (Luna restarted).`,
    });
  } catch (error: any) {
    console.error('Error removing user from blacklist:', error.message);
    res.status(500).json({ message: 'Failed to remove user from blacklist.' });
  }
});


const bufferMessage = (from: string, messageBody: string) => {
  if (messageBuffer[from]) {
    messageBuffer[from] += `\n${messageBody}`;
  } else {
    messageBuffer[from] = messageBody;
  }

  return new Promise<string>((resolve) => {
    setTimeout(() => {
      const concatenatedMessageBody = messageBuffer[from];
      delete messageBuffer[from];
      resolve(concatenatedMessageBody);
    }, 20000); // 10 seconds delay
  });
};

/**
 * Webhook message listener (POST)
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const bodyParam = req.body;

  if (
    bodyParam.object &&
    bodyParam.entry &&
    bodyParam.entry[0].changes &&
    bodyParam.entry[0].changes[0].value.messages &&
    bodyParam.entry[0].changes[0].value.messages[0]
  ) {
    try {
      
      // Extract message data
      const phoneNumberId = bodyParam.entry[0].changes[0].value.metadata.phone_number_id;
      const message = bodyParam.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const messageId = message.id;
      const messageImage = message.image;
      const messageAudio = message.audio;
      const messageType = message.type || 'text';
      let messageBody = message.text?.body || '';
      
      // 1) Check if message has already been processed
      const processedKey = `${PROCESSED_MESSAGES_KEY_PREFIX}:${messageId}`;
      const alreadyProcessed = await redis.get(processedKey);
      if (alreadyProcessed) {
        console.log(`Message ${messageId} has already been processed. Ignoring.`);
        res.status(200).send('Message already processed.');
        return;
      }
      console.log('Received Webhook Payload:', JSON.stringify(bodyParam, null, 2));
      await insertOrUpdateUser(from, 'Unknown'); // Replace 'Unknown' with the actual user name if available

      // Insert the message
      await insertMessage(from, messageBody, 'text', 'incoming'); // messageType is 'text' by default

      const blacklisted = await redis.get(`${BLACKLIST_KEY_PREFIX}:${from}`);
      if (blacklisted) {
        console.log(`User ${from} is blacklisted. Ignoring...`);
        res.status(200).send("Bypassed");
        return
      }


      // Mark message as processed (avoid duplicates)
      await redis.setex(processedKey, 300, 'true');  // TTL 1h or as needed

      // 2) Check if a flow was already initiated
      const initiatedKey = `${INITIATED_KEY_PREFIX}:${from}`;
      const flowInitiated = await redis.get(initiatedKey);

      // We'll also keep a reference to any active timer
      const timerKey = `${TIMER_KEYS_PREFIX}:${from}`;
      const phoneKey = `${TIMER_KEYS_PREFIX}:${from}:phone`;

      // 3) If the user has already initiated a flow
      if (flowInitiated) {
        console.log(`Flow already initiated for user ${from}. Checking for active timer...`);

        // If there's an active timer, clear it (the user replied, so we won't send the scheduled message)
        const existingTimer = await redis.get(timerKey);
        if (existingTimer) {
          console.log(`Clearing existing timer for user ${from} since they replied.`);
          await redis.del(timerKey);
        }
      } else {
        // Mark the flow as initiated
        await redis.setex(initiatedKey, 86400 * 2, 'true'); // The user can only initiate once in 2 days, for instance
        await redis.set(phoneKey, phoneNumberId);
        // Immediately send a reply to the user (the "immediate" part of your flow)
        console.log(`Starting the follow-up timer for user ${from}`);
        await setTimer(from, 0);
      }

      // 5) Handle the user’s message content (image, etc.) as you normally do
      let imageId: string | null = null;
      if (messageType === 'image' && messageImage) {
        // Download or process the image
        let downloaded_path = await getAndDownloadMedia(messageImage.id, messageType, from);
        imageId = await getImageID(downloaded_path);
        if (messageImage.caption) {
          messageBody = messageImage.caption.trim();
        } else {
          messageBody = 'Revisa esta imagen por favor.';
        }
      } else if (messageType === 'audio') {
        let downloaded_path = await getAndDownloadMedia(messageAudio.id, messageType, from);
        messageBody = await createTranscription(downloaded_path)
      }

      // Buffer the message, process with AI, etc.
      const concatenatedMessageBody = await bufferMessage(from, messageBody);

      console.log('--- Incoming WhatsApp Message ---');
      console.log(`Phone Number ID: ${phoneNumberId}`);
      console.log(`From: ${from}`);
      console.log(`Message ID: ${messageId}`);
      console.log(`Message: ${concatenatedMessageBody}`);
      console.log('---------------------------------');
      // Step 1: Check or Create OpenAI Thread
      const threadId = await createThread(from);
      console.log('Thread ID for this conversation:', threadId);

      // Step 2: Check for Active Run in Redis
      const activeRun = await redis.get(`${ACTIVE_RUN_KEY_PREFIX}:${threadId}`);
      if (activeRun) {
        console.log(`Active Run (${activeRun}) is still in progress. Ignoring message.`);
        res.status(200).send('Run in progress. Ignoring message.');
        return;
      }

      // Step 3: Add User Message to Thread
      await addMessageToThread(threadId, concatenatedMessageBody, imageId);

      // Step 4: Start Run and Stream Response
      const assistantResponse = await createRunForThread(threadId);

      switch (true) {
        case assistantResponse.includes("Revisar ⏰"): {
          const auth = await authorize();
          const freeTimes = await findFreeTimes(auth);
          await sendMessageToWhatsApp(phoneNumberId, from, `*Estos son los cupos disponibles más pronto* \n\n${freeTimes}`);
          res.status(200).send('Citas disponibles enviadas');
          return;

        }
        case assistantResponse.includes("Agendando ⏳"): {
          const normalizeDate = await normalizedDate(assistantResponse);
          if (normalizeDate.startsWith("No")) {
            await sendMessageToWhatsApp(phoneNumberId, from, "Lo sentimos pero no pudimos encontrar la fecha que deseas. Podrias elegir otra fecha o intentar con otro formato?. Ej: Lunes 10am o Viernes a las 2pm")
          }
          console.log("Normalized date:", normalizeDate);
          const dateMatch = getNextWeekday(normalizeDate);
          console.log("Extracted date:", dateMatch);
          const authForBooking = await authorize();
          const isTimeAvailable = await findFreeTimesOnDate(authForBooking, dateMatch);
          if (!isTimeAvailable) {
            await sendMessageToWhatsApp(phoneNumberId, from, "Lo sentimos pero al parecer la fecha seleccionada ya no está disponible. Por favor, selecciona otra fecha.");
            res.sendStatus(200);
            return;
          }
          const transformedDate = parseStartToTimeSlot(dateMatch, 60);
          const event = await bookEvent(authForBooking, transformedDate, "Cita Otoplastia para " + from);
          console.log("Created event response:", event);
          if (event.status !== 'confirmed') {
            await sendMessageToWhatsApp(phoneNumberId, from, "Lo sentimos pero al parecer la fecha seleccionada ya no está disponible o ha ocurrido un error. Por favor, selecciona otra fecha.");
            res.sendStatus(200);
            return;
          }
          await sendMessageToWhatsApp(phoneNumberId, from,
            `*Excelente, tu cita ha sido agendada con éxito, recuerda:*

- *Duración*: La cita dura entre 20 y 30 minutos.
- *Conexión*: Es importante que tengas una buena cámara en tu dispositivo para que la Dra. pueda evaluar adecuadamente.
- *Presentación*: Durante la cita, la Dra. Ana te hará algunas preguntas sobre tu historial médico y tus expectativas respecto a la Otoplastia.
- *Evaluación*: Ella te explicará el procedimiento de la cirugía, los cuidados necesarios y responderá a todas tus dudas.
- *Recomendaciones*: También te indicará si necesitas realizar algún examen previo a la cirugía.`
          );
          // Step 3: Add User Message to Thread
          await addMessageToThread(threadId, "Por favor devuelve los datos del cliente");

          // Step 4: Start Run and Stream Response
          const collected_data = await createRunForThread(threadId);
          const filePath = path.join(__dirname, `downloaded_media_${from}.jpg`);
          await insertClosedClient(from, collected_data, filePath);
          res.sendStatus(200);
          return;

        }
        case assistantResponse.includes("Revisar 📆"): {
          await sendMessageToWhatsApp(phoneNumberId, from, assistantResponse);
          console.log("Assistant response ", assistantResponse);
          const normalized = await normalizedDate(assistantResponse);
          console.log("Normalized date:", normalized);
          const authForCheck = await authorize();
          const responseMessage = await checkAndSuggestTimes(authForCheck, normalized);
          await sendMessageToWhatsApp(phoneNumberId, from, responseMessage);
          res.sendStatus(200);
          return;
        }
        case assistantResponse.includes("Por supuesto, permíteme un momento para enviarte unas imágenes de resultados de antes y después de la Otoplastia."): {
          await sendMessageToWhatsApp(phoneNumberId, from, assistantResponse);
          await sendImageToWhatsApp(phoneNumberId, from, "516657138090828"); // Image ID for "antes1.jpg"
          await sendImageToWhatsApp(phoneNumberId, from, "947261730233252"); // Image ID for "antes2.jpg"
          await sendImageToWhatsApp(phoneNumberId, from, "1991622941319988"); // Image ID for "antes3.jpg"
          res.sendStatus(200);
          return;
        }

        case assistantResponse.includes("Hablar con operador"): {
          await sendMessageToWhatsApp(phoneNumberId, from, "Por supuesto, permíteme un momento para conectar con un operador.");
          await redis.setex(`${BLACKLIST_KEY_PREFIX}:${from}`, 7200, 'true');
          res.status(200).send('Bypassed');
          return
        }

        default: {
          await sendMessageToWhatsApp(phoneNumberId, from, assistantResponse);
          res.sendStatus(200);
          return;
        }
      }
    } catch (error: any) {
      console.error('Error processing webhook:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    // console.log('No valid message found in payload.');
    res.status(200).send('Ignore message');
  }
});

router.get('/oauth-callback', (req, res) => {
  const { code } = req.query;
  
  // Display the code in a user-friendly format
  res.send(`
    <style>
      html, body {
        height: 100%;
        margin: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #f0f0f0;
      }

      .code-box {
        padding: 30px;
        background: #ffffff;
        border-radius: 12px;
        font-family: 'Arial', sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        text-align: center;
        max-width: 500px;
        width: 90%;
      }

      .code-box h2 {
        margin-top: 0;
        color: #333;
        font-size: 24px;
      }

      .code-box p {
        color: #555;
        font-size: 18px;
        margin: 15px 0;
      }

      .code-box strong {
        color: #1a73e8;
        font-weight: bold;
        word-break: break-all;
      }
    </style>

    <div class="code-box">
      <h2>Authorization Code Received</h2>
      <p>Code: <strong>${code}</strong></p>
      <p>You can now return to the setup process.</p>
    </div>
  `);
});



// Health check
router.get('/', (req: Request, res: Response) => {
  res.status(200).send('Hello, this is the webhook setup!');
});

export default router;
