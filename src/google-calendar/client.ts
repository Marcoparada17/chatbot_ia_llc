
import { google, Auth } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/meetings.space.created',
];

interface Credentials {
  refresh_token: string;
  access_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

async function loadSavedCredentialsIfExist(): Promise<Auth.OAuth2Client | null> {
  const {
    GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET,
    GOOGLE_CALENDAR_REFRESH_TOKEN,
  } = process.env;

  if (!GOOGLE_CALENDAR_CLIENT_ID || 
      !GOOGLE_CALENDAR_CLIENT_SECRET || 
      !GOOGLE_CALENDAR_REFRESH_TOKEN) {
    return null;
  }

  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET
  );

  oAuth2Client.setCredentials({
    refresh_token: GOOGLE_CALENDAR_REFRESH_TOKEN
  });

  return oAuth2Client;
}

export async function authorize(): Promise<Auth.OAuth2Client> {
  // Try loading existing credentials first
  const savedClient = await loadSavedCredentialsIfExist();
  if (savedClient) {
    console.log('Using stored refresh token credentials');
    return savedClient;
  }

  // Create new OAuth2 client with mandatory env vars
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirect_url = process.env.BACKEND_API_URL;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google Calendar client credentials in environment variables. ' +
      'Ensure GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET are set.'
    );
  }

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirect_url
  );

  // Generate and display authorization URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Forces refresh token to be provided
  });
  console.log('Authorize this app by visiting:', authUrl);

  // Get authorization code from user
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the authorization code: ', async (code: string) => {
      rl.close();

      try {
        const { tokens } = await oAuth2Client.getToken(code.trim());
        oAuth2Client.setCredentials(tokens);

        if (tokens.refresh_token) {
          console.log('\n⚠️ Add this to your environment variables for future use:');
          console.log(`GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        } else {
          console.warn('No refresh token received - session will expire');
        }

        resolve(oAuth2Client);
      } catch (error) {
        reject(new Error(`Authorization failed: ${(error as Error).message}`));
      }
    });
  });
}