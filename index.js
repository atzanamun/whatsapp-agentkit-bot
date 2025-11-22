import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.json());

// Credenciales de Render
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Inicializar OpenAI
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

/* ---------------------------------------------------------
   🔥 Ruta para VERIFICAR el webhook de Meta
--------------------------------------------------------- */
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "atza-verificacion-123";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK VERIFICADO CON ÉXITO ✔️");
      return res.status(200).send(challenge);
    } else {
      console.log("TOKEN INVALIDO ❌");
      return res.sendStatus(403);
    }
  }
  res.sendStatus(403);
});

/* ---------------------------------------------------------
   📩 Webhook para recibir mensajes de WhatsApp
--------------------------------------------------------- */
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const msg = entry?.changes?.[0]?.value?.messages?.[0];

    if (msg?.text) {
      const userText = msg.text.body;

      // Respuesta con OpenAI
      const ai = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente experto en eventos." },
          { role: "user", content: userText }
        ]
      });

      const respuesta = ai.choices[0].message.content;

      // Enviar mensaje por WhatsApp
      await axios.post(
        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: msg.from,
          text: { body: respuesta }
        },
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    res.sendStatus(500);
  }
});

/* ---------------------------------------------------------
   🌐 Ruta simple para pruebas
--------------------------------------------------------- */
app.get("/", (req, res) => {
  res.send("Bot WhatsApp + OpenAI funcionando correctamente.");
});

/* ---------------------------------------------------------
   🚀 Iniciar servidor
--------------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
