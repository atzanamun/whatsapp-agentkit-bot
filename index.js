import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.json());

// Credenciales (luego las metemos en Render)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Inicializar OpenAI
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// Ruta prueba
app.get("/", (req, res) => {
  res.send("Bot WhatsApp + OpenAI funcionando correctamente.");
});

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

      // Responder a WhatsApp
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
