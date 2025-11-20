import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { AgentKit } from "@openai/agentkit";
import OpenAI from "openai";

// Inicializar Express
const app = express();
app.use(bodyParser.json());

// Credenciales de WhatsApp (se agregan luego en Render como variables de entorno)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Inicializar OpenAI + AgentKit
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const agent = new AgentKit({
  client,
  model: "gpt-4.1-mini",
  system: `
Eres un asistente experto en eventos y localizaciones.
Tu tarea es responder preguntas como:
- ¿Dónde es el evento?
- ¿Cuál es la dirección?
- ¿Qué horario tiene?
- ¿Qué eventos hay hoy?

Responde de manera clara y amable.
`
});

// Ruta para confirmar que el servidor funciona
app.get("/", (req, res) => {
  res.send("Bot de WhatsApp + AgentKit está funcionando");
});

// Ruta del Webhook
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const message = entry.changes?.[0].value.messages?.[0];

    if (message?.text) {
      const userText = message.text.body;

      // Enviar mensaje al agente
      const result = await agent.run({
        messages: [{ role: "user", content: userText }]
      });

      const respuesta = result.output_text;

      // Enviar respuesta a WhatsApp
      await axios.post(
        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: message.from,
          text: { body: respuesta }
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    res.sendStatus(500);
  }
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
