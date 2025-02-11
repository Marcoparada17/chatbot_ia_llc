import { TimeSlot } from "../types";

/**
 * Parse a single date string to create a TimeSlot object or return the formatted date string.
 *
 * @param startString - Start date in the format 'YYYY-MM-DDTHH:mm:ss'.
 * @param durationInMinutes - Duration of the time slot in minutes.
 * @param returnType - Determines what the function returns ('string' | 'object').
 * @returns A formatted date string or a TimeSlot object.
 */
export function parseStartToTimeSlot(
    startString: string,
    durationInMinutes: number,
): TimeSlot {
    const start = new Date(startString);

    // Validate the parsed start date
    if (isNaN(start.getTime())) {
        throw new Error('Invalid start date format. Expected format is YYYY-MM-DDTHH:mm:ss');
    }

    const end = new Date(start.getTime() + durationInMinutes * 60 * 1000);

    // Return the TimeSlot object
    return { start, end };
}

// Helper to get current weekday in Spanish, in Bogotá time
export function getTodayBogotaWeekday(): string {
    const daysOfWeek = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    // Current time in Bogota
    const bogotaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
    return daysOfWeek[bogotaNow.getDay()];
  }