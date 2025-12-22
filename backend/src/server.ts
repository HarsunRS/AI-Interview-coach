import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { genai } from "google";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const client = new genai.Client({
  apiKey: process.env.GOOGLE_API_KEY
});

app.get("/", (req, res) => {
  res.send("Backend running successfully!");
});

app.post("/api/interview", async (req, res) => {
  try {
    const { userMessage } = req.body;

    const result = await client.responses.generate({
      model: "gemini-2.0-flash",
      contents: userMessage,
    });

    res.json({ reply: result.output_text });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

// required: use Render port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
