import OpenAI_Client from "../client/openai-client";

export const normalizedDate = async (userMessage: string) => {
  const url = "https://api.openai.com/v1/chat/completions";
  const method = "POST";

  const body = {
    model: "gpt-4",
    messages: [
      { role: "system", content:   `Eres un asistente útil que transforma expresiones de fecha/hora en lenguaje natural en un formato estructurado. Si la entrada se refiere a un día de la semana (ej: "Martes"), devuelve "DÍA HH:MM" usando formato de 24h. Si la entrada es una fecha específica (ej: "19 de febrero 2025"), devuelve "YYYY-MM-DD HH:MM". 

Ejemplos:
- "Martes a las 9am" → "Martes 09:00"
- "19 febrero 2025 a las 3pm" → "2025-02-19 15:00"
- "Lunes 10am" → "Lunes 10:00"

Reglas:
- Usa formato de 24h. "5pm" → "17:00".
- Si no hay minutos, asume ":00".
- Horario de oficina: 8am - 5pm (hora de Bogotá). Si la hora está fuera de este rango, responde "No puedo ayudarte en este momento".
- Solo devuelve el formato solicitado sin texto adicional.
- Si la entrada no es un día válido o fecha futura, responde "No puedo ayudarte en este momento".`
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
};