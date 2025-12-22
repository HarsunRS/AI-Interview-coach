
import { GoogleGenAI, Type, Chat, Modality } from "@google/genai";
import { UserProfile, Report, InterviewMode } from "../types";
import { PERSONAS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export class InterviewService {
  private chat: Chat | null = null;
  private profile: UserProfile | null = null;
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  private async getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return this.audioContext;
  }

  async initInterview(profile: UserProfile): Promise<{ text: string, audio?: string }> {
    this.profile = profile;
    const persona = PERSONAS.find(p => p.id === profile.interviewerPersonaId) || PERSONAS[0];
    
    const systemInstruction = `
      You are ${persona.name}, a ${persona.role} with a ${persona.style} style.
      Candidate Name: ${profile.name || "Candidate"}.
      Target Role: ${profile.role || "Not specified"}.
      Experience: ${profile.experienceLevel}.
      Stack: ${profile.techStack || "Not specified"}.
      
      INPUT DATA:
      Candidate Resume: ${profile.resumeText || "No resume provided."}
      Job Description: ${profile.jobDescription || "No JD provided."}
      
      INTERVIEW PROTOCOL:
      1. ROLE FIT ANALYSIS: If both Resume and JD are provided, compare them. Ask questions that specifically target the gaps between the candidate's experience and the job requirements.
      2. TAILORED DEPTH: Adjust technical complexity based on the Role and Tech Stack provided.
      3. Ask ONE question at a time.
      4. ADAPTIVE LOGIC: Increase difficulty if the candidate is doing well; pivot if they struggle.
      5. BE REALISTIC: Stay in character. Do not provide feedback or "Well done" during the conversation. 
      6. START: Introduce yourself and mention you've reviewed their details (Resume/JD) before asking the first question.
    `;

    this.chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction, temperature: 0.7 }
    });

    const response = await this.chat.sendMessage({ message: "Review the profile context and start the interview session." });
    const text = response.text;
    const audio = await this.generateSpeech(text, persona.voice);

    return { text, audio };
  }

  async sendMessage(message: string): Promise<{ text: string, audio?: string }> {
    if (!this.chat) throw new Error("Not initialized");
    const response = await this.chat.sendMessage({ message });
    const text = response.text;
    const persona = PERSONAS.find(p => p.id === this.profile?.interviewerPersonaId) || PERSONAS[0];
    const audio = await this.generateSpeech(text, persona.voice);
    return { text, audio };
  }

  async generateSpeech(text: string, voice: string): Promise<string | undefined> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
          }
        }
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) {
      console.warn("TTS failed", e);
      return undefined;
    }
  }

  async generateReport(history: string): Promise<Report> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        Analyze this interview transcript and produce a detailed JSON report.
        Focus on:
        - Technical competence vs the required Role/Stack.
        - Communication effectiveness.
        - Behavioral indicators.
        
        Transcript:
        ${history}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            label: { type: Type.STRING, enum: ['Beginner', 'Intermediate', 'Interview Ready', 'Strong'] },
            skillScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, score: { type: Type.NUMBER } },
                required: ["name", "score"]
              }
            },
            communication: {
              type: Type.OBJECT,
              properties: {
                fluency: { type: Type.NUMBER },
                clarity: { type: Type.NUMBER },
                fillerWordsCount: { type: Type.NUMBER },
                grammarScore: { type: Type.NUMBER },
                pronunciationScore: { type: Type.NUMBER },
                pronunciationFeedback: { type: Type.STRING }
              }
            },
            behavioral: {
              type: Type.OBJECT,
              properties: {
                confidence: { type: Type.NUMBER },
                ownership: { type: Type.NUMBER },
                leadership: { type: Type.NUMBER }
              }
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedPractice: { type: Type.ARRAY, items: { type: Type.STRING } },
            questionBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING },
                  userAnswer: { type: Type.STRING },
                  idealAnswer: { type: Type.STRING },
                  type: { type: Type.STRING },
                  correctness: { type: Type.NUMBER },
                  depth: { type: Type.NUMBER },
                  clarity: { type: Type.NUMBER },
                  structure: { type: Type.NUMBER },
                  tag: { type: Type.STRING, enum: ['Excellent', 'Partial', 'Weak'] },
                  feedback: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text);
  }

  async playAudio(base64: string) {
    this.stopAudio();
    const ctx = await this.getAudioContext();
    const data = this.decode(base64);
    const buffer = await this.decodeAudioData(data, ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    this.currentAudioSource = source;
    source.start();
    return new Promise(resolve => {
      source.onended = () => {
        if (this.currentAudioSource === source) this.currentAudioSource = null;
        resolve(null);
      };
    });
  }

  stopAudio() {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch (e) {}
      this.currentAudioSource = null;
    }
  }

  private decode(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}

export const interviewService = new InterviewService();
