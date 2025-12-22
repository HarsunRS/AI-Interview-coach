import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

app.get("/", (req, res) => {
  res.send("Backend running successfully!");
});

app.post("/api/interview", async (req, res) => {
  try {
    const { userMessage } = req.body;

    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(userMessage);

    res.json({ reply: result.response.text() });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
