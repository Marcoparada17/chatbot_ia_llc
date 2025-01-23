import { promises as fs } from 'fs';
import path from 'path';
import { google, Auth } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/meetings.space.created',
];

// Remove TOKEN_PATH since it's not used anymore
// const TOKEN_PATH = path.join(process.cwd(), "..", 'token.json');

/**
 * Interface for OAuth2 Credentials
 */
interface Credentials {
  refresh_token: string;
  access_token: string;
  expiry_date: number;
  token_type?: string;
  scope?: string;
}

/**
 * Load credentials from environment variables if they exist
 */
async function loadSavedCredentialsIfExist(): Promise<Auth.OAuth2Client | null> {
  const {
    GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET,
    GOOGLE_CALENDAR_REFRESH_TOKEN,
    GOOGLE_CALENDAR_ACCESS_TOKEN,
    GOOGLE_CALENDAR_EXPIRY_DATE,
  } = process.env;

  if (
    !GOOGLE_CALENDAR_CLIENT_ID ||
    !GOOGLE_CALENDAR_CLIENT_SECRET ||
    !GOOGLE_CALENDAR_REFRESH_TOKEN ||
    !GOOGLE_CALENDAR_ACCESS_TOKEN ||
    !GOOGLE_CALENDAR_EXPIRY_DATE
  ) {
    console.error('Environment variables for Google Calendar credentials are missing.');
    return null;
  }

  console.log('Using credentials from environment variables...');

  const credentials: Credentials = {
    refresh_token: GOOGLE_CALENDAR_REFRESH_TOKEN,
    access_token: GOOGLE_CALENDAR_ACCESS_TOKEN,
    expiry_date: parseInt(GOOGLE_CALENDAR_EXPIRY_DATE, 10),
  };

  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET
  );
  oAuth2Client.setCredentials(credentials);

  if (credentials.expiry_date < Date.now()) {
    console.log('Access token is expired. Refreshing...');
    try {
      await oAuth2Client.refreshAccessToken();
      console.log('Access token refreshed successfully.');
    } catch (err) {
      console.error('Error refreshing access token:', err);
      return null;
    }
  }

  return oAuth2Client;
}

/**
 * Save credentials (runtime-only since environment variables are used)
 */
async function saveCredentials(oAuth2Client: Auth.OAuth2Client): Promise<void> {
  const credentials = oAuth2Client.credentials;

  if (!credentials || !credentials.access_token || !credentials.expiry_date) {
    console.error('No valid credentials to save.');
    return;
  }

  // Update environment variables (runtime-only)
  process.env.GOOGLE_CALENDAR_ACCESS_TOKEN = credentials.access_token;
  process.env.GOOGLE_CALENDAR_EXPIRY_DATE = credentials.expiry_date.toString();

  console.log('Updated access token and expiry date in environment variables.');
}

/**
 * Authorize the app using OAuth2
 */
export async function authorize(): Promise<Auth.OAuth2Client> {
  let auth = await loadSavedCredentialsIfExist();
  if (auth) {
    return auth;
  }

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    'http://localhost'
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this URL:', authUrl);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    readline.question('Enter the code from that page here: ', async (code: string) => {
      readline.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        await saveCredentials(oAuth2Client);
        resolve(oAuth2Client);
      } catch (err) {
        console.error('Error during authorization:', err);
        reject(err);
      }
    });
  });
}