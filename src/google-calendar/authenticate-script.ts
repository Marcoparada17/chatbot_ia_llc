// google-auth-setup.ts
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import dotenv from 'dotenv';
import { findFreeTimes } from './find-available-times';

// Import your existing calendar functions

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/meetings.space.created',
];

async function input(prompt: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function verifyCredentials(auth: any): Promise<boolean> {
  try {
    console.log('\nVerifying credentials...');
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Make a simple API call to verify credentials
    const response = await calendar.calendars.get({
      calendarId: 'primary'
    });
    
    console.log('\n✅ Credentials verified successfully!');
    console.log(`Calendar timezone: ${response.data.timeZone}`);
    
    // Additional verification with findFreeTimes
    console.log('\nTesting free time lookup...');
    await findFreeTimes(auth);
    return true;
  } catch (error) {
    console.error('\n⚠️ Credential verification failed:');
    console.error((error as Error).message);
    return false;
  }
}

async function setupGoogleAuth() {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
  
  // Parse existing .env content
  const existingEnv = envContent ? dotenv.parse(envContent) : {};
  const currentEnv = { ...process.env, ...existingEnv };

  // Get client credentials
  let clientId = currentEnv.GOOGLE_CALENDAR_CLIENT_ID;
  if (!clientId) {
    clientId = await input('Enter Google Client ID: ');
  }

  let clientSecret = currentEnv.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientSecret) {
    clientSecret = await input('Enter Google Client Secret: ');
  }

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost'
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\nVisit this URL to authorize:');
  console.log(`\n${authUrl}\n`);

  const code = await input('Enter authorization code: ');

  const { tokens } = await oAuth2Client.getToken(code.trim());
  
  if (!tokens.refresh_token) {
    throw new Error('No refresh token received');
  }

  // Update .env file
  const newEnv = [
    `GOOGLE_CALENDAR_CLIENT_ID=${clientId}`,
    `GOOGLE_CALENDAR_CLIENT_SECRET=${clientSecret}`,
    `GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}`
  ];

  // Preserve existing variables
  const existingLines = envContent.split('\n').filter(line => {
    return !line.startsWith('GOOGLE_CALENDAR_') && line.trim() !== '';
  });

  writeFileSync(envPath, [...existingLines, ...newEnv].join('\n'));
  console.log('\n✅ .env file updated successfully!');

  // Verify credentials work
  oAuth2Client.setCredentials({
    refresh_token: tokens.refresh_token
  });
  
  const verified = await verifyCredentials(oAuth2Client);
  if (!verified) {
    console.error('\n⚠️ Setup incomplete - credentials verification failed');
    process.exit(1);
  }

  console.log('\n🎉 Setup completed successfully! You can now run the main application.');
}

setupGoogleAuth().catch((error) => {
  console.error('\n⚠️ Setup failed:');
  console.error(error.message);
  process.exit(1);
});