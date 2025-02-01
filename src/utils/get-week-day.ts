export function parseNormalizedDate(normalizedDate: string): string {
  // Check if the input is a specific date (YYYY-MM-DD HH:MM)
  const isSpecificDate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalizedDate);

  if (isSpecificDate) {
      const [datePart, timePart] = normalizedDate.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      // Validate office hours (8am-5pm Bogotá)
      if (hours < 8 || hours >= 17) {
          throw new Error('El horario está fuera del horario de oficina (8am-5pm).');
      }

      // Create ISO string with Bogotá timezone (-05:00)
      const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00-05:00`;
      const parsedDate = new Date(isoStr);

      // Check if valid date
      if (isNaN(parsedDate.getTime())) {
          throw new Error('Fecha inválida.');
      }

      // Check if date is in the future (Bogotá time)
      const currentBogotaTime = new Date(Date.now() - (5 * 3600 * 1000)); // UTC-5
      if (parsedDate <= currentBogotaTime) {
          throw new Error('La fecha y hora ya han pasado.');
      }

      return isoStr;
  } else {
      // Existing logic for weekdays (renamed from getNextWeekday)
      const [weekday, time] = normalizedDate.split(' ');
      const [hourStr, minuteStr = '0'] = time.split(':');
      const requestedHour = parseInt(hourStr, 10);
      const requestedMinute = parseInt(minuteStr, 10);

      const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const targetDayIndex = daysOfWeek.indexOf(weekday);
      if (targetDayIndex === -1) throw new Error(`Día inválido: ${weekday}`);

      const now = new Date();
      const currentBogotaTime = new Date(now.getTime() - (5 * 3600 * 1000)); // UTC-5

      let daysToAdd = targetDayIndex - currentBogotaTime.getDay();
      if (daysToAdd < 0) daysToAdd += 7;

      // Check if time has passed today
      if (daysToAdd === 0) {
          const currentHour = currentBogotaTime.getHours();
          const currentMinute = currentBogotaTime.getMinutes();
          if (requestedHour < currentHour || (requestedHour === currentHour && requestedMinute <= currentMinute)) {
              daysToAdd += 7;
          }
      }

      const targetDate = new Date(currentBogotaTime);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      targetDate.setHours(requestedHour, requestedMinute, 0, 0);

      // Format to ISO with -05:00 offset
      const isoStr = targetDate.toISOString().replace('Z', '-05:00');
      return isoStr;
  }
}

// Helper function to pad numbers
function pad(num: number): string {
  return num.toString().padStart(2, '0');
}