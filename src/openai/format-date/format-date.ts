import OpenAI_Client from "../client/openai-client";

export const normalizedDate = async (userMessage: string) => {
  const url = "https://api.openai.com/v1/chat/completions";
  const method = "POST";

  const body = {
    model: "gpt-4",
    messages: [
      { role: "system", content:   `Eres un asistente útil que transforma expresiones de fecha/hora en lenguaje natural en un formato "DÍA HH:MM", usando el formato de 24 horas. Ejemplo:
        "Martes a las 9am" -> "Martes 09:00"
        "Miércoles a las 5pm" -> "Miércoles 17:00"
        "Lunes 10am" -> "Lunes 10:00"
        Si no se indican los minutos, asume ":00".
        Solo debes devolver el formato esperado, sin incluir comillas o ningun otro caracter o palabra.
        Siempre el mensaje que recibiras siempre sera un dia de la semana y una hora.
        Si dice a "Martes a las 5", siempre debes asumir que es a las 17:00.
        Solo devolveras horas de "Oficina" de 8am a 6pm.
        Si se te pregunta cualquiera hora fuera del horario de "Oficina", debes devolver "No puedo ayudarte en este momento".
        Si se te pregunta "Jueves a las 9", siempre hara referencia a la mañana. Lo mismo para cualquier horario comprendido entre 8am a 6pm.`
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