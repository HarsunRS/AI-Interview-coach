import express from "express";
import cors from "cors";
import { genai } from "google";

const app = express();
app.use(cors());
app.use(express.json());

const client = new genai.Client({
  apiKey: process.env.GOOGLE_API_KEY
});

app.post("/api/interview", async (req, res) => {
  const { userMessage } = req.body;

  try {
    const result = await client.responses.generate({
      model: "gemini-2.0-flash",
      contents: userMessage,
    });

    res.json({ reply: result.output_text });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

app.listen(8000, () => console.log("Server running on port 8000"));
