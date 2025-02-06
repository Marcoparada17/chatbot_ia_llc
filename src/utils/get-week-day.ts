/**
 * Generates an ISO string for the next occurrence of a given weekday and time in Bogota.
 * Example input: "Martes 09:00" → returns ISO string "YYYY-MM-DDTHH:mm:ss-05:00"
 */
export function getNextWeekday(normalisedDate: string): string {
  const [weekday, time] = normalisedDate.split(" ");
  const [hourStr, minuteStr = "0"] = time.split(":");
  const requestedHour = parseInt(hourStr, 10);
  const requestedMinute = parseInt(minuteStr, 10);

  const daysOfWeek: string[] = [
    "Domingo", "Lunes", "Martes",
    "Miércoles", "Jueves", "Viernes", "Sábado",
  ];
  const targetDayIndex: number = daysOfWeek.indexOf(weekday);
  if (targetDayIndex === -1) {
    throw new Error(`Invalid weekday provided: ${weekday}`);
  }

  const now: Date = new Date();
  const bogotaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));

  const currentDayIndex = bogotaNow.getDay();
  let daysToAdd = targetDayIndex - currentDayIndex;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }

  // If it’s the same weekday, check if the time has passed
  if (daysToAdd === 0) {
    const currentHour = bogotaNow.getHours();
    const currentMinute = bogotaNow.getMinutes();
    if (
      requestedHour < currentHour ||
      (requestedHour === currentHour && requestedMinute <= currentMinute)
    ) {
      daysToAdd += 7;
    }
  }

  bogotaNow.setDate(bogotaNow.getDate() + daysToAdd);
  bogotaNow.setHours(requestedHour, requestedMinute, 0, 0);

  const year = bogotaNow.getFullYear();
  const month = String(bogotaNow.getMonth() + 1).padStart(2, "0");
  const day = String(bogotaNow.getDate()).padStart(2, "0");
  const hour = String(bogotaNow.getHours()).padStart(2, "0");
  const minute = String(bogotaNow.getMinutes()).padStart(2, "0");
  const second = String(bogotaNow.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}-05:00`;
}

/**
 * Parses a string like "2025-02-09 09:00" or "Martes 09:00".
 * Returns an ISO string with -05:00 if valid and within office hours.
 */
export function parseNormalisedDate(normalisedDate: string): string {
  const isSpecificDate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalisedDate);

  if (isSpecificDate) {
    const [datePart, timePart] = normalisedDate.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    // Validate office hours
    if (hours < 8 || hours >= 17) {
      throw new Error('El horario está fuera del horario de oficina (8am-5pm).');
    }

    const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00-05:00`;
    const parsedDate = new Date(isoStr);

    if (isNaN(parsedDate.getTime())) {
      throw new Error('Fecha inválida.');
    }

    // Check if it's in the future
    const bogotaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    if (parsedDate <= bogotaNow) {
      throw new Error('La fecha y hora ya han pasado.');
    }

    return isoStr;
  } else {
    // We assume "Día HH:MM" format
    const [weekday, time] = normalisedDate.split(' ');
    const [hourStr, minuteStr = '0'] = time.split(':');
    const requestedHour = parseInt(hourStr, 10);
    const requestedMinute = parseInt(minuteStr, 10);

    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const targetDayIndex = daysOfWeek.indexOf(weekday);
    if (targetDayIndex === -1) throw new Error(`Día inválido: ${weekday}`);

    const now = new Date();
    const bogotaNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    let daysToAdd = targetDayIndex - bogotaNow.getDay();
    if (daysToAdd < 0) daysToAdd += 7;

    // If it’s the same weekday, check the current time
    if (daysToAdd === 0) {
      const currentHour = bogotaNow.getHours();
      const currentMinute = bogotaNow.getMinutes();
      if (requestedHour < currentHour || (requestedHour === currentHour && requestedMinute <= currentMinute)) {
        daysToAdd += 7;
      }
    }

    bogotaNow.setDate(bogotaNow.getDate() + daysToAdd);
    bogotaNow.setHours(requestedHour, requestedMinute, 0, 0);

    if (requestedHour < 8 || requestedHour >= 17) {
      throw new Error('El horario está fuera del horario de oficina (8am-5pm).');
    }

    const isoStr = bogotaNow.toISOString().replace('Z', '-05:00');
    return isoStr;
  }
}

// Helper function to pad numbers
function pad(num: number): string {
  return num.toString().padStart(2, '0');
}