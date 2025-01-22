import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { TimeSlot } from '../types';

export async function bookEvent(auth: OAuth2Client, slot: TimeSlot, summary: string) {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
        summary,
        start: { dateTime: slot.start.toISOString(), timeZone: 'America/Bogota' },
        end: { dateTime: slot.end.toISOString(), timeZone: 'America/Bogota' },
        conferenceData: {
            createRequest: {
                requestId: `meet-${slot.start.getTime()}`, // Unique request ID for the Meet link.
                conferenceSolutionKey: {
                    type: 'hangoutsMeet', // Specifies Google Meet.
                },
            },
        },
    };

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1, // Required to enable Google Meet integration.
        });

        console.log(`Event "${summary}" created with Google Meet link:`);
        console.log(`Start: ${slot.start.toLocaleString('en-US', { timeZone: 'America/Bogota' })}`);
        console.log(`End: ${slot.end.toLocaleString('en-US', { timeZone: 'America/Bogota' })}`);

        if (response.data.conferenceData?.entryPoints) {
            const meetLink = response.data.conferenceData.entryPoints.find(
                (entry) => entry.entryPointType === 'video'
            )?.uri;
            console.log(`Google Meet link: ${meetLink}`);
        }

        return response.data;
    } catch (error) {
        console.error('Error booking event with Google Meet:', error);
        throw new Error('Could not create calendar event with Google Meet.');
    }
}