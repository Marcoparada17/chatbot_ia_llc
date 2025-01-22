// auth.js
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(process.cwd(), "..", 'token.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    const auth = google.auth.fromJSON(credentials);

    if (auth.credentials.expiry_date < Date.now()) {
      console.log('Refreshing access token...');
      await auth.refreshAccessToken();
      const refreshedToken = auth.credentials;
      await saveCredentials(refreshedToken);
    }

    return auth;
  } catch (err) {
    console.log('No saved credentials found.');
    return null;
  }
}

async function saveCredentials(credentials: { refresh_token: string; access_token: string; expiry_date: number }) {
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    refresh_token: credentials.refresh_token,
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

export async function authorize() {
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
        await saveCredentials(tokens);
        resolve(oAuth2Client);
      } catch (err) {
        reject(err);
      }
    });
  });
}

