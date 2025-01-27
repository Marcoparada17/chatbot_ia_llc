/**
 * Find the next free time slots on the user's primary calendar.
 */
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { getNextWeekday } from '../utils/get-week-day';

export async function findFreeTimes(auth: OAuth2Client): Promise<string> {
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Get current time in Bogota timezone
    const bogotaNow = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Bogota' 
    });
    const now = new Date(bogotaNow);
    
    // Set time range in Bogota time
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

    try {
        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: startTime.toISOString(),
                timeMax: endTime.toISOString(),
                items: [{ id: 'primary' }],
            },
        });

        const busyPeriods = response.data.calendars?.primary?.busy || [];
        const freeTimes: { start: Date; end: Date }[] = [];
        let lastEnd = new Date(startTime);

        // Bogota time checker
        const isOfficeTime = (date: Date) => {
            const bogotaDate = new Date(date.toLocaleString('en-US', { 
                timeZone: 'America/Bogota' 
            }));
            const day = bogotaDate.getDay();
            const hour = bogotaDate.getHours();
            return day >= 1 && day <= 5 && hour >= 8 && hour < 17;
        };

        // Round to next full hour in Bogota time
        const roundToNextHour = (date: Date) => {
            const bogotaDate = new Date(date.toLocaleString('en-US', { 
                timeZone: 'America/Bogota' 
            }));
            const rounded = new Date(bogotaDate);
            rounded.setMinutes(0, 0, 0);
            rounded.setHours(rounded.getHours() + 1);
            return new Date(rounded.toLocaleString('en-US', { 
                timeZone: 'UTC' 
            }));
        };

        lastEnd = roundToNextHour(lastEnd);

        // Process busy periods
        for (const busy of busyPeriods) {
            if (!busy.start || !busy.end) continue;
            
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);

            // Find gaps between lastEnd and busyStart
            while (lastEnd < busyStart) {
                const slotEnd = roundToNextHour(lastEnd);
                
                if (slotEnd > busyStart) break;
                
                if (isOfficeTime(lastEnd) && isOfficeTime(slotEnd)) {
                    freeTimes.push({
                        start: new Date(lastEnd),
                        end: new Date(slotEnd)
                    });
                }
                
                lastEnd = slotEnd;
                if (freeTimes.length >= 3) break;
            }

            if (freeTimes.length >= 3) break;
            lastEnd = roundToNextHour(busyEnd);
        }

        // Check remaining time after last busy period
        while (lastEnd < endTime && freeTimes.length < 3) {
            const slotEnd = roundToNextHour(lastEnd);
            
            if (isOfficeTime(lastEnd) && isOfficeTime(slotEnd)) {
                freeTimes.push({
                    start: new Date(lastEnd),
                    end: new Date(slotEnd)
                });
            }
            
            lastEnd = slotEnd;
        }

        // Format results for Bogota time
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        const formattedSlots = freeTimes.map(slot => {
            const start = new Date(slot.start.toLocaleString('en-US', { 
                timeZone: 'America/Bogota' 
            }));
            
            const end = new Date(slot.end.toLocaleString('en-US', { 
                timeZone: 'America/Bogota' 
            }));

            return {
                day: daysOfWeek[start.getDay()],
                startTime: start.toLocaleTimeString('es-CO', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: false 
                }),
                endTime: end.toLocaleTimeString('es-CO', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: false 
                })
            };
        });

        const freeTimesString = formattedSlots
            .map(slot => `${slot.day} ${slot.startTime} - ${slot.endTime}`)
            .join('\n');

        console.log('Horarios disponibles (Hora de Bogotá):');
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

    // Convert input to Bogota time
    const specificTime = new Date(dateTime);
    const bogotaTime = new Date(specificTime.toLocaleString('en-US', { 
        timeZone: 'America/Bogota' 
    }));

    const startTime = new Date(bogotaTime).toISOString();
    const endTime = new Date(bogotaTime.getTime() + 60 * 60 * 1000).toISOString(); // Check 1-hour slot

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

        // Format output in Bogota time
        const formattedTime = bogotaTime.toLocaleString('es-ES', { 
            timeZone: 'America/Bogota', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });

        if (isAvailable) {
            console.log(`El horario a las ${formattedTime} está disponible.`);
        } else {
            console.log(`El horario a las ${formattedTime} no está disponible.`);
        }

        return isAvailable;
    } catch (error) {
        console.error('Error verificando disponibilidad:', error);
        throw new Error('No se pudo verificar la disponibilidad en el calendario.');
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

        // 1) Build a "next weekday" string in Bogota time
        const isoDateBogota = getNextWeekday(normalizedLanguageDate);
        console.log("Verificando disponibilidad a partir de", isoDateBogota);

        // 2) Convert to Bogota time
        let currentTime = new Date(isoDateBogota);
        const bogotaTime = new Date(currentTime.toLocaleString('en-US', { 
            timeZone: 'America/Bogota' 
        }));

        // 3) Define office hours in Bogota time
        const officeStartHour = 8; // 8 AM
        const officeEndHour = 17;  // 5 PM

        while (true) {
            const dayOfWeek = bogotaTime.getDay(); // 0=Sun, 6=Sat

            // Skip weekends
            if (dayOfWeek > 0 && dayOfWeek < 6) {
                const hour = bogotaTime.getHours();

                // Snap to office hours
                if (hour < officeStartHour) {
                    bogotaTime.setHours(officeStartHour, 0, 0, 0);
                } else if (hour >= officeEndHour) {
                    // Move to next weekday at 8:00
                    bogotaTime.setDate(bogotaTime.getDate() + 1);
                    bogotaTime.setHours(officeStartHour, 0, 0, 0);
                    continue;
                }

                // 4) Check availability in Bogota time
                const currentIso = bogotaTime.toISOString();
                const isAvailable = await findFreeTimesOnDate(auth, currentIso);

                if (isAvailable) {
                    // 5) Format the response in Bogota time
                    const localBogotaString = bogotaTime.toLocaleString('es-ES', {
                        timeZone: 'America/Bogota',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    });

                    return `El horario deseado está disponible. ¿Te gustaría agendar una cita el día: *${daysOfWeek[dayOfWeek]} a las ${localBogotaString}*?`;
                }

                // Not available => move forward 1 hour
                bogotaTime.setHours(bogotaTime.getHours() + 1);
            } else {
                // Weekend => skip to next weekday at 8:00
                bogotaTime.setDate(bogotaTime.getDate() + 1);
                bogotaTime.setHours(officeStartHour, 0, 0, 0);
            }
        }
    } catch (error) {
        console.error('Error buscando el horario más cercano:', error);
        throw new Error('No se pudo encontrar un horario disponible.');
    }
}