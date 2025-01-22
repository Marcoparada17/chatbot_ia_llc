const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(process.cwd(), '..', 'token.json');

/**
 * Load credentials from token.json if available.
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    const auth = google.auth.fromJSON(credentials);

    // Refresh token if necessary
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

/**
 * Save credentials (including refreshed tokens) to token.json.
 */
async function saveCredentials(credentials) {
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

/**
 * Authorize the client with saved credentials or trigger manual login.
 */
async function authorize() {
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
    readline.question('Enter the code from that page here: ', async (code) => {
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
/**
 * Find the next free time slots on the user's primary calendar.
 */
async function findFreeTimes(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const startTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // Start from 1 hour from now
  const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Look ahead 7 days

  try {
      const response = await calendar.freebusy.query({
          requestBody: {
              timeMin: startTime,
              timeMax: endTime,
              items: [{ id: 'primary' }],
          },
      });

      const busyPeriods = response.data.calendars?.primary?.busy || [];
      const freeTimes = [];
      let lastEnd = new Date(startTime);

      const isOfficeTime = (date) => {
          const day = date.getDay();
          const hour = date.getHours();
          return day >= 1 && day <= 5 && hour >= 9 && hour < 17; // Weekdays from 9 AM to 5 PM
      };

      const roundToNextHour = (date) => {
          date.setMinutes(0, 0, 0);
          date.setHours(date.getHours() + 1);
          return date;
      };

      lastEnd = roundToNextHour(lastEnd);

      busyPeriods.forEach((busy) => {
          if (!busy.start || !busy.end) return;
          const busyStart = new Date(busy.start);
          if (lastEnd < busyStart) {
              while (lastEnd < busyStart) {
                  const nextHour = new Date(lastEnd);
                  nextHour.setHours(lastEnd.getHours() + 1);
                  if (nextHour <= busyStart && isOfficeTime(lastEnd) && isOfficeTime(nextHour)) {
                      freeTimes.push({ start: new Date(lastEnd), end: nextHour });
                      if (freeTimes.length >= 3) break;
                  }
                  lastEnd = nextHour;
              }
          }
          lastEnd = new Date(busy.end);
          lastEnd = roundToNextHour(lastEnd);
      });

      while (lastEnd < new Date(endTime) && freeTimes.length < 3) {
          const nextHour = new Date(lastEnd);
          nextHour.setHours(lastEnd.getHours() + 1);
          if (nextHour <= new Date(endTime) && isOfficeTime(lastEnd) && isOfficeTime(nextHour)) {
              freeTimes.push({ start: new Date(lastEnd), end: nextHour });
          }
          lastEnd = nextHour;
      }

      const freeTimesString = freeTimes.map((slot, index) => {
          return `Disponible: ${slot.start.toLocaleString('es-ES', { timeZone: 'America/Bogota' })} a ${slot.end.toLocaleString('es-ES', { timeZone: 'America/Bogota' })}`;
      }).slice(0, 3).join('\n'); // Ensure only 3 lines

      console.log('Next free time slots (Bogota Time):');
      console.log(freeTimesString);

      return freeTimesString;
  } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error('Could not check calendar availability.');
  }
}

/**
* Book an event in the specified time slot.
*/
async function bookEvent(auth, slot, summary = 'Hiking') {
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
      summary,
      start: { dateTime: slot.start.toISOString(), timeZone: 'America/Bogota' },
      end: { dateTime: slot.end.toISOString(), timeZone: 'America/Bogota' },
  };

  try {
      const response = calendar.events.insert({
          calendarId: 'primary',
          resource: event,
      });
      console.log(`Event "${summary}" created:`);
      console.log(`Start: ${slot.start.toLocaleString('en-US', { timeZone: 'America/Bogota' })}`);
      console.log(`End: ${slot.end.toLocaleString('en-US', { timeZone: 'America/Bogota' })}`);
      return response.data;
  } catch (error) {
      console.error('Error booking event:', error);
      throw new Error('Could not create calendar event.');
  }
}

(async () => {
  try {
      const auth = await authorize();
      const freeTimes = await findFreeTimes(auth);
  } catch (error) {
      console.error('Error:', error);
  }
})();
