export function getNextWeekday(normalizedDate: string): string {
  // Example input: "Jueves 12:00"
  // 1) Extract weekday/time
  const [weekday, time] = normalizedDate.split(" ");
  const [hourStr, minuteStr = "0"] = time.split(":");
  const requestedHour = parseInt(hourStr, 10);
  const requestedMinute = parseInt(minuteStr, 10);

  // No AM/PM checks — we assume "12:00" is midday in 24-hour format.

  // 2) Map weekday to numeric index
  const daysOfWeek: string[] = [
    "Domingo", "Lunes", "Martes",
    "Miércoles", "Jueves", "Viernes", "Sábado",
  ];
  const targetDayIndex: number = daysOfWeek.indexOf(weekday);
  if (targetDayIndex === -1) {
    throw new Error(`Invalid weekday provided: ${weekday}`);
  }

  // 3) Get the current time in Colombia by subtracting 5 hours from UTC
  const now: Date = new Date();
  const nowUtcMillis: number = now.getTime() + (now.getTimezoneOffset() * 60000);
  // Bogotá time = UTC time - 5 hours
  const nowInBogota: Date = new Date(nowUtcMillis + (-5) * 3600000);

  // 4) Figure out how many days to move ahead
  const currentDayIndex: number = nowInBogota.getDay(); // 0 = Sun, 6 = Sat
  let daysToAdd: number = targetDayIndex - currentDayIndex;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }

  // If it's the same weekday, ensure the requested time is still ahead
  if (daysToAdd === 0) {
    const currentHour: number = nowInBogota.getHours();
    const currentMinute: number = nowInBogota.getMinutes();
    if (
      requestedHour < currentHour ||
      (requestedHour === currentHour && requestedMinute <= currentMinute)
    ) {
      // time already passed => jump to next week
      daysToAdd += 7;
    }
  }

  // 5) Move date to the target weekday
  nowInBogota.setDate(nowInBogota.getDate() + daysToAdd);

  // 6) Set the requested HH:mm (still in Colombia time)
  nowInBogota.setHours(requestedHour, requestedMinute, 0, 0);

  // 7) Return an explicit “YYYY-MM-DDTHH:mm:ss-05:00” string
  const year: number = nowInBogota.getFullYear();
  const month: string = String(nowInBogota.getMonth() + 1).padStart(2, "0");
  const day: string = String(nowInBogota.getDate()).padStart(2, "0");
  const hour: string = String(nowInBogota.getHours()).padStart(2, "0");
  const minute: string = String(nowInBogota.getMinutes()).padStart(2, "0");
  const second: string = String(nowInBogota.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}-05:00`;
}