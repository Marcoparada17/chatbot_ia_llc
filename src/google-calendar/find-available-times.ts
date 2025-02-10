/**
 * Find the next free time slots on the user's primary calendar.
 */
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

/**
 * Find the next free time slots on the user's primary calendar.
 */
export async function findFreeTimes(auth: OAuth2Client): Promise<string> {
  const calendar = google.calendar({ version: 'v3', auth });

  // Current time in Bogota (using UTC as base)
  const now = new Date();
  const bogotaOffset = -5 * 60; // Bogota is UTC-5 (no DST)

  const startTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
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

    // Check if a given UTC date is within Bogota office hours (8 AM - 5 PM)
    const isOfficeTime = (date: Date) => {
      // Convert UTC to Bogota time (UTC-5)
      const bogotaTime = new Date(date.getTime() + bogotaOffset * 60 * 1000);
      const day = bogotaTime.getUTCDay(); // 0 (Sun) - 6 (Sat)
      const hour = bogotaTime.getUTCHours();
      return day >= 1 && day <= 5 && hour >= 8 && hour < 17; // Mon-Fri 8 AM - 5 PM
    };

    // Round to next full hour in Bogota time (UTC-5)
    const roundToNextHour = (date: Date) => {
      const bogotaTime = new Date(date.getTime() + bogotaOffset * 60 * 1000);
      const minutes = bogotaTime.getUTCMinutes();
      const seconds = bogotaTime.getUTCSeconds();
      const ms = bogotaTime.getUTCMilliseconds();

      if (minutes === 0 && seconds === 0 && ms === 0) {
        return new Date(date.getTime() + 60 * 60 * 1000); // already on the hour, add 1h
      }

      // Time to next hour in Bogota time
      const incrementMs = (60 - minutes) * 60 * 1000 - seconds * 1000 - ms;
      const nextHourBogota = new Date(bogotaTime.getTime() + incrementMs);
      
      // Convert back to UTC (Bogota UTC-5)
      return new Date(nextHourBogota.getTime() - bogotaOffset * 60 * 1000);
    };

    lastEnd = roundToNextHour(lastEnd);

    for (const busy of busyPeriods) {
      if (!busy.start || !busy.end) continue;
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);

      while (lastEnd < busyStart) {
        const slotEnd = roundToNextHour(lastEnd);
        if (slotEnd > busyStart) break;

        if (isOfficeTime(lastEnd) && isOfficeTime(slotEnd)) {
          freeTimes.push({ start: new Date(lastEnd), end: new Date(slotEnd) });
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
        freeTimes.push({ start: new Date(lastEnd), end: new Date(slotEnd) });
      }
      lastEnd = slotEnd;
    }

    // Format slots in Bogota time
    const formatter = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const formattedSlots = freeTimes.map(slot => {
      const startDate = new Date(slot.start);
      const endDate = new Date(slot.end);

      // Get day name in Spanish (e.g., "miércoles")
      const day = formatter.format(startDate).split(', ')[0];
      const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);

      // Get start and end times
      const startTime = startDate.toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const endTime = endDate.toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return `${capitalizedDay} ${startTime} - ${endTime}`;
    });

    console.log('Horarios disponibles (Hora de Bogotá):');
    console.log(formattedSlots.join('\n'));

    return formattedSlots.join('\n');
  } catch (error) {
    console.error('Error checking availability:', error);
    throw new Error('Could not check calendar availability.');
  }
}


/**
 * Checks if there's a free 1-hour slot starting at the specified date/time (Bogota).
 * Returns true if free, false otherwise.
 */
export async function findFreeTimesOnDate(auth: OAuth2Client, dateTime: string): Promise<boolean> {
  const calendar = google.calendar({ version: 'v3', auth });

  // Convert input to Bogota time
  const specificTime = new Date(dateTime);
  const bogotaTime = new Date(specificTime.toLocaleString('en-US', {
    timeZone: 'America/Bogota'
  }));

  const startTime = new Date(bogotaTime).toISOString();
  const endTime = new Date(bogotaTime.getTime() + 30 * 60 * 1000).toISOString(); // 1-hour slot

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

    // Convert the normalised weekday/time into an ISO string
    let bogotaTime = new Date(normalizedLanguageDate);

    // Office hours
    const officeStartHour = 8;  // 8 AM
    const officeEndHour = 17;   // 5 PM

    while (true) {
      const dayOfWeek = bogotaTime.getDay();

      // Skip weekends
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        const hour = bogotaTime.getHours();

        // Snap to office hours if needed
        if (hour < officeStartHour) {
          bogotaTime.setHours(officeStartHour, 0, 0, 0);
        } else if (hour >= officeEndHour) {
          // Move to next weekday at 8:00
          bogotaTime.setDate(bogotaTime.getDate() + 1);
          bogotaTime.setHours(officeStartHour, 0, 0, 0);
          continue;
        }

        const currentIso = bogotaTime.toISOString();
        const isAvailable = await findFreeTimesOnDate(auth, currentIso);

        if (isAvailable) {
          const localBogotaString = bogotaTime.toLocaleString('es-ES', {
            timeZone: 'America/Bogota',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });

          return `El horario deseado está disponible. ¿Te gustaría agendar una cita el día: *${daysOfWeek[dayOfWeek]} a las ${localBogotaString}*?`;
        }

        // Move forward 1 hour if not available
        bogotaTime.setHours(bogotaTime.getHours() + 1);
      } else {
        // Skip to next weekday at 8:00
        bogotaTime.setDate(bogotaTime.getDate() + 1);
        bogotaTime.setHours(officeStartHour, 0, 0, 0);
      }
    }
  } catch (error) {
    console.error('Error buscando el horario más cercano:', error);
    throw new Error('No se pudo encontrar un horario disponible.');
  }
}