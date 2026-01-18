
import { GoogleGenAI, Type, Chat, Modality } from "@google/genai";
import { UserProfile, Report } from "../types";
import { PERSONAS } from "../constants";

export class InterviewService {
  private chat: Chat | null = null;
  private profile: UserProfile | null = null;
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

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
      You are ${persona.name}, acting as a ${persona.role}. Your style is ${persona.style}.
      
      CRITICAL DIRECTIVE: You are the lead interviewer. 
      1. You MUST start the interview immediately.
      2. You MUST present a realistic technical scenario or behavioral challenge.
      3. You MUST end every single response with exactly ONE clear, direct question for the candidate.
      4. Never be passive. Do not wait for the candidate to lead. 
      5. Keep your responses concise (under 3 sentences) but punchy.

      SESSION CONTEXT:
      - Goal: ${profile.interviewGoal}
      - Technology Focus: ${profile.techStack.join(', ')}
      - Seniority: ${profile.experienceLevel}
      - Target Company: ${profile.targetCompany || 'General Industry'}
    `;

    const ai = this.getAI();
    this.chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { 
        systemInstruction, 
        temperature: 0.8,
      }
    });

    const response = await this.chat.sendMessage({ message: "SYSTEM_SIGNAL: Candidate has entered the room. Start the interview now with your first scenario and question." });
    const text = response.text || "Connection established. Let's begin. Can you tell me about a complex project you've worked on recently?";
    const audio = await this.generateSpeech(text, persona.voice);

    return { text, audio };
  }

  async sendMessage(message: string): Promise<{ text: string, audio?: string }> {
    if (!this.chat) throw new Error("Neural link not established.");
    const response = await this.chat.sendMessage({ message });
    const text = response.text || "I see. Let's move to the next topic. How do you handle tight deadlines?";
    const persona = PERSONAS.find(p => p.id === this.profile?.interviewerPersonaId) || PERSONAS[0];
    const audio = await this.generateSpeech(text, persona.voice);
    return { text, audio };
  }

  async generateSpeech(text: string, voice: string): Promise<string | undefined> {
    try {
      const ai = this.getAI();
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
      return undefined;
    }
  }

  async generateReport(history: string): Promise<Report> {
    if (!history || history.trim().length < 10) {
      throw new Error("Insufficient session data to generate an audit.");
    }

    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Perform an exhaustive professional evaluation based on this interview transcript. 
      If the transcript is short, provide the best possible estimation of readiness.
      Return a valid JSON object matching the required schema.

      TRANSCRIPT:
      ${history}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "overallScore", "label", "metrics", "questionBreakdown"],
          properties: {
            summary: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            label: { type: Type.STRING },
            duration: { type: Type.STRING },
            metrics: {
              type: Type.OBJECT,
              properties: {
                technicalAccuracy: { type: Type.NUMBER },
                communication: { type: Type.NUMBER },
                problemSolving: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                pronunciation: { type: Type.NUMBER },
                fluency: { type: Type.NUMBER }
              }
            },
            questionBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING },
                  userAnswer: { type: Type.STRING },
                  idealAnswer: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  correctness: { type: Type.NUMBER },
                  tag: { type: Type.STRING },
                  feedback: {
                    type: Type.OBJECT,
                    properties: {
                      whatWentWell: { type: Type.ARRAY, items: { type: Type.STRING } },
                      areasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    try {
      const cleanText = response.text.replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanText);
    } catch (e) {
      throw new Error("Evaluation engine returned malformed data.");
    }
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
      try { this.currentAudioSource.stop(); } catch (e) {}
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
