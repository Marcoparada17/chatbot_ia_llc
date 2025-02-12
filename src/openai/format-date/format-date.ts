import OpenAI_Client from "../client/openai-client";

/**
 * Calls GPT to transform a natural language date into either "DÍA HH:MM" or "YYYY-MM-DD HH:MM".
 */
export async function normalisedDate(userMessage: string): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";
  const method = "POST";

  const body = {
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `
Eres un asistente útil que transforma expresiones de fecha/hora en lenguaje natural en un formato estructurado. Si la entrada se refiere a un día de la semana (ej: "Martes"), devuelve "DÍA HH:MM" usando formato de 24h. Si la entrada es una fecha específica (ej: "19 de febrero 2025"), devuelve "YYYY-MM-DD HH:MM". Si el usuario solo envia una "hora" como "14:30" o "4:30", asume que es "Hoy" y devuelve la palabra "Hoy 4:30" o "Hoy 14:30". 
Si se proporciona "Mañana a las 9am" o "Mañana a las 3pm" debes devolver "Mañana 9:00" o "Mañana 15:00"
Ejemplos:
- "Martes a las 9am" → "Martes 09:00"
- "19 febrero 2025 a las 3pm" → "2025-02-19 15:00"
- "Lunes 10am" → "Lunes 10:00"
- "14:30" → "Hoy 14:30"
- "Mañana a las 9am" → "Mañana 09:00"
- "Mañana a las 3pm" → "Mañana 15:00"

Reglas:
- Usa formato de 24h. "5pm" → "17:00".
- Si no hay minutos, asume ":00".
- Horario de oficina: 8am - 5pm (hora de Bogotá). Si la hora está fuera de este rango, responde "No puedo ayudarte en este momento".
- Solo devuelve el formato solicitado sin texto adicional.
- Si la entrada no es un día válido o fecha futura, responde "No puedo ayudarte en este momento".
- Estamos en el año 2025, siempre debes devolver fechas en este año.
- Si el usuario no indica dia o fecha, debes devolver "Hoy HH:MM".
`
      },
      { role: "user", content: userMessage },
    ],
    temperature: 0,
  };

  try {
    const response = await OpenAI_Client(url, method, body);
    return response.choices[0].message.content.trim();
  } catch (error: any) {
    console.error("Error fetching completion:", error.message);
    throw error;
  }
}