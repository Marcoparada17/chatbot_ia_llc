/**
 * Find the next free time slots on the user's primary calendar.
 */
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { getNextWeekday } from '../utils/get-week-day';

export async function findFreeTimes(auth: OAuth2Client): Promise<string> {
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

        const isOfficeTime = (date: Date) => {
            const day = date.getDay();
            const hour = date.getHours();
            return day >= 1 && day <= 5 && hour >= 9 && hour < 17; // Weekdays from 9 AM to 5 PM
        };

        const roundToNextHour = (date: Date) => {
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
                        if (freeTimes.length >= 3) return;
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

        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        const uniqueFreeTimes = Array.from(new Set(freeTimes.map(slot => slot.start.toISOString()))).map(isoString => {
            const slotStart = new Date(isoString);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            return { start: slotStart, end: slotEnd };
        });

        const freeTimesString = uniqueFreeTimes.map((slot) => {
            const startDay = daysOfWeek[slot.start.getDay()];
            const startTime = slot.start.toLocaleTimeString('es-ES', {
                timeZone: 'America/Bogota',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            const endTime = slot.end.toLocaleTimeString('es-ES', {
                timeZone: 'America/Bogota',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            return `${startDay} ${startTime} a ${endTime}`;
        }).join('\n');

        console.log('Next free time slots (Bogota Time):');
        console.log(freeTimesString);

        return freeTimesString;
    } catch (error) {
        console.error('Error checking availability:', error);
        throw new Error('Could not check calendar availability.');
    }
}


/**
* Find free time slots on a specific date and time.
* @param {Object} auth - The authentication object.
* @param {string} dateTime - The specific date and time to check in 'YYYY-MM-DDTHH:mm:ss' format.
* @returns {Promise<boolean>} - Returns true if the time slot is available, otherwise false.
*/
export async function findFreeTimesOnDate(auth: OAuth2Client, dateTime: string): Promise<boolean> {
    const calendar = google.calendar({ version: 'v3', auth });
    const specificTime = new Date(dateTime);
    const startTime = specificTime.toISOString();
    const endTime = new Date(specificTime.getTime() + 60 * 60 * 1000).toISOString(); // Check 1-hour slot

    try {
         const response = await calendar.freebusy.query({
              requestBody: {
                    timeMin: startTime,
                    timeMax: endTime,
                    items: [{ id: 'primary' }],
              },
         });

         const busyPeriods = response.data.calendars?.primary?.busy || [];

         const isAvailable = busyPeriods.length === 0;

         if (isAvailable) {
              console.log(`The time slot starting at ${specificTime.toLocaleString('es-ES', { timeZone: 'America/Bogota' })} is available.`);
         } else {
              console.log(`The time slot starting at ${specificTime.toLocaleString('es-ES', { timeZone: 'America/Bogota' })} is not available.`);
         }

         return isAvailable;
    } catch (error) {
         console.error('Error finding free times availability:', error);
         throw new Error('Could not check calendar availability.');
    }
}
/**
 * Check availability for a specific date and suggest alternative slots.
 * @param {OAuth2Client} auth - The authentication object.
 * @param {string} normalizedLanguageDate - Natural language date input, e.g., "Martes 09:00".
 * @returns {Promise<string>} - Message indicating availability or suggesting alternative slots.
 */
export async function checkAndSuggestTimes(auth: OAuth2Client, normalizedLanguageDate: string): Promise<string> {
    try {
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        // 1) Build a "next weekday" string, e.g., "2024-12-26T12:00:00-05:00"
        const isoDateBogota = getNextWeekday(normalizedLanguageDate);
        console.log("Checking for availability starting at", isoDateBogota);

        // 2) `new Date("2024-12-26T12:00:00-05:00")` will be correct for Colombia noon
        let currentTime = new Date(isoDateBogota);

        // 3) Define your office hours
        const officeStartHour = 9;
        const officeEndHour = 17;

        while (true) {
            const dayOfWeek = currentTime.getDay(); // 0=Sun, 6=Sat
            // Skip weekends
            if (dayOfWeek > 0 && dayOfWeek < 6) {
                const hour = currentTime.getHours();

                // Snap to office hours
                if (hour < officeStartHour) {
                    currentTime.setHours(officeStartHour, 0, 0, 0);
                } else if (hour >= officeEndHour) {
                    // Move to next weekday at 9:00
                    currentTime.setDate(currentTime.getDate() + 1);
                    currentTime.setHours(officeStartHour, 0, 0, 0);
                    continue;
                }

                // 4) Check availability
                const currentIso = currentTime.toISOString();
                const isAvailable = await findFreeTimesOnDate(auth, currentIso);
                if (isAvailable) {
                    // 5) Format the response in Colombian local time
                    const localBogotaString = currentTime.toLocaleString("es-ES", {
                        timeZone: "America/Bogota",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    });
                    return `El horario deseado está disponible. Te gustaria agendar una cita el dia: *${daysOfWeek[dayOfWeek]} a las ${localBogotaString}*?`;
                }

                // Not available => move forward 1 hour
                currentTime.setHours(currentTime.getHours() + 1);
            } else {
                // Weekend => skip to next weekday at 9:00
                currentTime.setDate(currentTime.getDate() + 1);
                currentTime.setHours(officeStartHour, 0, 0, 0);
            }
        }
    } catch (error) {
        console.error("Error finding closest available time:", error);
        throw new Error("No se pudo encontrar un horario disponible.");
    }
}
