
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
      You are ${persona.name}, acting as a ${persona.role}. Your interviewing style is ${persona.style}.
      
      SESSION CONTEXT:
      - Candidate's Goal: "${profile.interviewGoal}"
      - Target Company: ${profile.targetCompany || 'a high-stakes technology firm'}
      - Role: ${profile.rolePreference === 'Specific Role' ? profile.role : 'Core Professional'}
      - Experience: ${profile.experienceLevel}
      - Stack: ${profile.techStack.join(', ')}
      - Context: ${profile.resumeText || 'No Resume Provided'}

      SCENARIO-BASED INSTRUCTION:
      1. START IMMEDIATELY: Set a specific workplace scenario related to their target company or role. 
         e.g., "Welcome. We're currently dealing with a critical bottleneck in our ${profile.techStack[0] || 'backend'} pipeline. Before we dive into the details, walk me through..."
      2. USE RESUME: Refer to a specific project or skill in their resume context.
      3. ADAPTIVE CHALLENGE: Escalate technical difficulty based on their depth. 
      4. ONE QUESTION: Ask exactly one high-impact question to open. No excessive pleasantries.
    `;

    const ai = this.getAI();
    this.chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { 
        systemInstruction, 
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const response = await this.chat.sendMessage({ message: "The candidate has entered. Start the scenario." });
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
      console.error("TTS Error:", e);
      return undefined;
    }
  }

  async generateReport(history: string): Promise<Report> {
    const ai = this.getAI();
    // Use gemini-3-flash-preview for FAST high-quality report generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Audit this interview history for technical accuracy, scenario performance, and pronunciation. 
      Return a STRICT JSON evaluation.
      
      HISTORY:
      ${history}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
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
            speechAnalysis: {
              type: Type.OBJECT,
              properties: {
                clarityScore: { type: Type.NUMBER },
                pace: { type: Type.STRING },
                fillerWordUsage: { type: Type.STRING },
                pronunciationGaps: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            behavioralAnalysis: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                eyeContact: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, percentage: { type: Type.STRING }, avg: { type: Type.STRING } } },
                bodyLanguage: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, posture: { type: Type.STRING }, gestures: { type: Type.STRING } } },
                facialExpression: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, engagement: { type: Type.STRING }, nervousness: { type: Type.STRING } } },
                setupQuality: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, lighting: { type: Type.STRING } } },
                energyLevel: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, consistency: { type: Type.STRING } } }
              }
            },
            roadmap: {
              type: Type.OBJECT,
              properties: {
                technical: { type: Type.ARRAY, items: { type: Type.STRING } },
                communication: { type: Type.ARRAY, items: { type: Type.STRING } }
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
                  type: { type: Type.STRING },
                  correctness: { type: Type.NUMBER },
                  duration: { type: Type.STRING },
                  tag: { type: Type.STRING },
                  feedback: {
                    type: Type.OBJECT,
                    properties: {
                      whatWentWell: { type: Type.ARRAY, items: { type: Type.STRING } },
                      areasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  },
                  pronunciationFeedback: { type: Type.STRING },
                  interviewerNotes: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      throw new Error("Evaluation parsing failed.");
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
