import pool from "../db/db";
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
async function loadSavedCredentialsIfExist() {
  try {
    // Fetch the saved credentials from the database
    const { rows } = await pool.query('SELECT * FROM tokens LIMIT 1');

    if (rows.length === 0) {
      console.log('No saved credentials found in the database.');
      return null;
    }

    const credentials = rows[0];

    // Create the Google Auth object from the retrieved credentials
    const auth = google.auth.fromJSON({
      type: 'authorized_user',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
    });

    // Check if the token is expired and refresh if necessary
    if (credentials.expiry_date < Date.now()) {
      console.log('Refreshing access token...');
      const { credentials: refreshedToken } = await auth.refreshAccessToken();

      // Save the refreshed token back to the database
      await saveCredentials(refreshedToken);
    }

    return auth;
  } catch (err) {
    console.error('Error loading credentials from the database:', err);
    return null;
  }
}

async function saveCredentials(credentials: { refresh_token: string; access_token: string; expiry_date: number }) {
  try {
    await pool.query('DELETE FROM tokens'); // Remove any existing token

    await pool.query(
      `
      INSERT INTO tokens (access_token, refresh_token, expiry_date, client_id, client_secret)
      VALUES ($1, $2, $3, $4, $5);
      `,
      [
        credentials.access_token,
        credentials.refresh_token,
        credentials.expiry_date,
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      ]
    );

    console.log('Credentials saved to database.');
  } catch (err) {
    console.error('Error saving credentials:', err);
  }
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

