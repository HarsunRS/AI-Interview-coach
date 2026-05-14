
import { GoogleGenAI, Type, Chat, Modality } from "@google/genai";
import { UserProfile, Report, ResumeAnalysis, ResumeProfile, JobMatch } from "../types";
import { PERSONAS } from "../constants";

export class InterviewService {
  private chat: Chat | null = null;
  private profile: UserProfile | null = null;
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private fallbackQuestionIndex = 0;
  private ollamaMessages: Array<{role: string, content: string}> = [];
  private ollamaModel: string | null = null;
  private ollamaChecked = false;

  private getAI() {
    const key = localStorage.getItem('ip_gemini_key') || process.env.API_KEY || '';
    if (!key) throw new Error('No Gemini API key configured. Open Settings to add one.');
    return new GoogleGenAI({ apiKey: key });
  }

  private async getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return this.audioContext;
  }

  // ── Ollama local-model fallback ──────────────────────────────────────────

  private async getOllamaModel(): Promise<string | null> {
    if (this.ollamaChecked) return this.ollamaModel;
    this.ollamaChecked = true;
    try {
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const names: string[] = (data.models ?? []).map((m: any) => m.name as string);
      const preferred = ['qwen2.5', 'qwen2.5-coder', 'llama3.2', 'llama3.1', 'mistral', 'gemma2', 'phi4', 'deepseek-r1'];
      this.ollamaModel =
        preferred.find(p => names.some(n => n.startsWith(p))) ??
        names.find(n => !n.includes('embed')) ??
        null;
      return this.ollamaModel;
    } catch {
      return null;
    }
  }

  private async ollamaChat(
    messages: Array<{role: string, content: string}>,
    json = false,
  ): Promise<string> {
    const model = await this.getOllamaModel();
    if (!model) throw new Error('Ollama not available');
    const body: Record<string, unknown> = { model, messages, stream: false };
    if (json) body.format = 'json';
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    return data.message?.content ?? '';
  }

  private parseOllamaJson(raw: string): any {
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in Ollama response');
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  private getFallbackQuestion(answer?: string) {
    const profile = this.profile;
    const skills = profile?.techStack?.length ? profile.techStack.join(', ') : 'your strongest technical skills';
    const primarySkill = profile?.techStack?.[0] || 'your strongest technical skill';
    const role = profile?.role?.trim();
    const rolePhrase = role || 'your target role';
    const companyPhrase = profile?.targetCompany?.trim() || 'the company you are targeting';
    const projectPrompt = profile?.resumeText
      ? 'Pick one project from your resume and explain the problem it solved, your contribution, and the final result.'
      : 'Tell me about one project you built recently, including your contribution and the final result.';

    const baseQuestions = [
      `Welcome. Let's start with your self-introduction: could you briefly tell me about yourself and why you are preparing for ${rolePhrase}?`,
      projectPrompt,
      `Let's move into your skills. Can you explain how you have used ${skills} in a real project or practical task?`,
      'Now a technical depth question: describe one challenging bug, design decision, or performance issue you faced, and how you solved it.',
      'Behavioral round: tell me about a time you received critical feedback or faced pressure, and how you handled it.',
      'Tell me about a situation where you had to learn something quickly for a project or assignment. How did you approach it?',
      `Describe ${primarySkill} as if you were explaining it to a non-technical teammate.`,
      'What is one weakness in your current preparation, and what specific steps are you taking to improve it?',
      `For ${rolePhrase}, what kind of work do you want to be trusted with in your first few months?`,
      'Tell me about a time you worked with a teammate or mentor to solve a difficult problem.',
      `If this were an interview at ${companyPhrase}, how would you connect your background to their needs?`,
      'Let us finish with reflection: what is the strongest reason an interviewer should select you right now?'
    ];

    const followUpQuestions = [
      `Let's go deeper into ${primarySkill}: what mistake do beginners usually make with it, and how would you avoid that?`,
      `Give me a concrete example of how you would apply ${primarySkill} to solve a real business or user problem.`,
      `For ${rolePhrase}, describe one technical decision you would make carefully and what tradeoffs you would compare.`,
      'Tell me about one project improvement you would make if you had one more week to work on it.',
      'Describe a time when your first solution was not good enough. What did you change?',
      `If you joined ${companyPhrase}, what would you do in your first month to become productive quickly?`,
      'What is one concept from your preparation that you can explain with an example from daily life?',
      'Tell me about a time you had to debug something without immediately knowing the root cause.',
      'How do you decide whether to ask for help or keep investigating a problem yourself?',
      'What is one answer from this interview that you would improve if you could answer again?'
    ];

    const question = this.fallbackQuestionIndex < baseQuestions.length
      ? baseQuestions[this.fallbackQuestionIndex]
      : followUpQuestions[(this.fallbackQuestionIndex - baseQuestions.length) % followUpQuestions.length];
    this.fallbackQuestionIndex += 1;
    return question;
  }

  private splitTranscript(history: string) {
    const turns = history
      .split(/\n{2,}/)
      .map(part => part.trim())
      .filter(Boolean);

    const pairs: Array<{ questionText: string; userAnswer: string }> = [];
    const questionCounts = new Map<string, number>();
    let currentQuestion = 'Interview question';

    for (const turn of turns) {
      if (turn.startsWith('MODEL:')) {
        currentQuestion = turn.replace(/^MODEL:\s*/i, '').trim() || currentQuestion;
      }

      if (turn.startsWith('USER:')) {
        const normalizedQuestion = currentQuestion.toLowerCase().replace(/\s+/g, ' ').trim();
        const seenCount = questionCounts.get(normalizedQuestion) || 0;
        questionCounts.set(normalizedQuestion, seenCount + 1);

        pairs.push({
          questionText: seenCount === 0 ? currentQuestion : `${currentQuestion} (follow-up ${seenCount + 1})`,
          userAnswer: turn.replace(/^USER:\s*/i, '').trim() || 'No answer captured.'
        });
      }
    }

    return pairs.length ? pairs : [{ questionText: 'Interview response', userAnswer: history.trim() }];
  }

  private buildFallbackReport(history: string): Report {
    const pairs = this.splitTranscript(history);
    const answers = pairs.map(pair => pair.userAnswer);
    const allWords = answers.join(' ').trim().split(/\s+/).filter(Boolean);
    const averageWords = answers.length ? allWords.length / answers.length : 0;
    const fillerMatches = answers.join(' ').match(/\b(um|uh|like|actually|basically|you know|sort of|kind of)\b/gi) || [];
    const emptyAnswers = answers.filter(answer => /^(no answer captured\.?)$/i.test(answer.trim())).length;

    const communication = Math.max(45, Math.min(86, Math.round(58 + averageWords * 0.7 - fillerMatches.length * 2 - emptyAnswers * 10)));
    const technicalAccuracy = Math.max(45, Math.min(84, Math.round(communication - 3 + Math.min(12, pairs.length * 2))));
    const fluency = Math.max(45, Math.min(88, Math.round(communication + (fillerMatches.length ? -4 : 6))));
    const confidence = Math.max(45, Math.min(86, Math.round(communication + (averageWords > 35 ? 5 : -3))));
    const problemSolving = Math.max(45, Math.min(84, Math.round((technicalAccuracy + communication) / 2)));
    const pronunciation = Math.max(55, Math.min(85, fluency));
    const overallScore = Math.round((technicalAccuracy + communication + problemSolving + confidence + pronunciation + fluency) / 6);

    return {
      summary: 'The AI report service was temporarily unavailable, so this report was generated from the captured transcript. Use it as a practice summary, then generate another report when the model is available for deeper scoring.',
      overallScore,
      label: overallScore >= 82 ? 'Interview Ready' : overallScore >= 68 ? 'Intermediate' : 'Beginner',
      duration: 'Practice session',
      metrics: {
        technicalAccuracy,
        communication,
        problemSolving,
        confidence,
        pronunciation,
        fluency
      },
      behavioralAnalysis: {
        score: communication,
        eyeContact: { score: 70, percentage: 'N/A', avg: 'N/A' },
        bodyLanguage: { score: 70, posture: 'Not measured', gestures: 'Not measured' },
        facialExpression: { score: 70, engagement: 'Not measured', nervousness: 'Not measured' },
        setupQuality: { score: 70, lighting: 'Not measured' },
        energyLevel: { score: confidence, consistency: 'Estimated from answer length and completeness' }
      },
      speechAnalysis: {
        clarityScore: fluency,
        pace: averageWords > 95 ? 'Too Fast' : averageWords < 18 ? 'Too Slow' : 'Optimal',
        fillerWordUsage: fillerMatches.length >= 8 ? 'High' : fillerMatches.length >= 3 ? 'Moderate' : 'Low',
        pronunciationGaps: []
      },
      roadmap: {
        technical: [
          'Answer each technical question with problem, approach, tradeoff, and result.',
          'Add specific tools, APIs, data structures, or metrics when describing project work.'
        ],
        communication: [
          'Keep answers structured: context, action, result.',
          'Pause briefly before answering and reduce filler words in longer responses.'
        ]
      },
      questionBreakdown: pairs.map((pair, index) => {
        const wordCount = pair.userAnswer.split(/\s+/).filter(Boolean).length;
        const correctness = Math.max(45, Math.min(82, Math.round(52 + wordCount * 0.8)));
        return {
          questionText: pair.questionText,
          userAnswer: pair.userAnswer,
          idealAnswer: 'A strong answer should be specific, structured, and include concrete examples or tradeoffs.',
          type: 'Transcript-based',
          difficulty: index < 2 ? 'Easy' : index < 4 ? 'Medium' : 'Hard',
          correctness,
          duration: 'N/A',
          tag: correctness >= 76 ? 'Excellent' : correctness >= 60 ? 'Partial' : 'Weak',
          feedback: {
            whatWentWell: wordCount > 20 ? ['You provided enough detail for the evaluator to understand your answer.'] : ['You completed the response.'],
            areasToImprove: wordCount > 20 ? ['Add clearer outcomes, numbers, or tradeoffs where possible.'] : ['Expand the answer with a concrete example and result.']
          },
          interviewerNotes: 'Generated locally because the AI report model was unavailable.'
        };
      }),
      improvementPlan: {
        prioritySkills: [
          { skill: 'Technical Depth', currentLevel: 'Developing', targetLevel: 'Proficient', resources: ['LeetCode medium problems', 'System Design Primer (GitHub)', 'CS fundamentals review'] },
          { skill: 'Answer Structure', currentLevel: 'Basic', targetLevel: 'Strong', resources: ['STAR framework practice', 'CAR method for technical answers', 'Record and review mock answers'] },
          { skill: 'Communication Clarity', currentLevel: 'Building', targetLevel: 'Confident', resources: ['Practice 2-minute answer limit', 'Remove filler words consciously', 'Peer mock interviews'] }
        ],
        weeklyPlan: [
          { week: 'Week 1', focus: 'Foundation', tasks: ['Identify 3 weakest topics from this report', 'Revise core concepts for each', 'Write out a polished self-introduction'] },
          { week: 'Week 2', focus: 'Technical Depth', tasks: ['Solve 5 LeetCode problems relevant to your stack', 'Study one system design case end-to-end', 'Practice explaining trade-offs out loud'] },
          { week: 'Week 3', focus: 'Behavioral & Stories', tasks: ['Prepare 5 STAR stories from past projects', 'Do a full mock interview with a peer', 'Refine answers that scored below 65%'] },
          { week: 'Week 4', focus: 'Full Simulation', tasks: ['Complete 2 timed mock interviews', 'Review and sharpen all weak answers', 'Run one final practice under real conditions'] }
        ],
        practiceQuestions: [
          { topic: 'Behavioral', question: 'Tell me about a time you disagreed with a teammate\'s technical decision.', hint: 'Use STAR — focus on your reasoning process and how you reached alignment' },
          { topic: 'Technical', question: 'Explain the trade-offs between SQL and NoSQL databases.', hint: 'Cover: consistency, scalability, schema flexibility, query patterns' },
          { topic: 'System Design', question: 'Design a notification service that handles millions of users.', hint: 'Think: queues, fan-out, delivery guarantees, retry logic' },
          { topic: 'Behavioral', question: 'How do you handle receiving critical feedback on your work?', hint: 'Show growth mindset — share a real example where feedback improved your output' },
          { topic: 'Technical', question: 'Walk me through how you would debug a production performance issue.', hint: 'Cover: metrics/observability, hypothesis, isolation, fix, and post-mortem' }
        ],
        quickWins: [
          'Start every answer with a one-sentence direct response before adding context',
          'Replace "I think" with "Based on my experience..." to project confidence',
          'Add at least one specific metric or outcome to every project you mention',
          'Eliminate filler words (um, basically, you know) — pause instead',
          'Prepare a crisp 60-second self-introduction and rehearse it until natural'
        ]
      }
    };
  }

  private evaluateAnswerLocally(answer: string): string {
    const words = answer.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const techKeywords = [
      'React', 'Angular', 'Vue', 'Node', 'Express', 'Python', 'Django', 'Flask',
      'Java', 'Spring', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'AWS',
      'TypeScript', 'JavaScript', 'GraphQL', 'Kubernetes', 'REST', 'API',
      'microservices', 'TensorFlow', 'PyTorch', 'Machine Learning', 'CI/CD', 'Git'
    ];
    const techMentioned = techKeywords.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(answer));
    const hasNumbers = /\d+/.test(answer);
    const hasStructure = /\b(first|then|finally|because|however|although|therefore|as a result|specifically|for example)\b/i.test(answer);
    const fillerCount = (answer.match(/\b(um|uh|like|basically|you know|sort of|kind of|actually)\b/gi) || []).length;
    const mentionedProject = /\b(project|built|developed|implemented|designed|created|worked on)\b/i.test(answer);

    let score = 50;
    if (wordCount > 100) score += 25;
    else if (wordCount > 60) score += 15;
    else if (wordCount > 30) score += 5;
    else if (wordCount < 15) score -= 25;
    if (hasNumbers) score += 10;
    if (hasStructure) score += 10;
    if (techMentioned.length > 0) score += 5;
    score -= Math.min(15, fillerCount * 3);
    score = Math.max(15, Math.min(95, score));

    const quality = score >= 72 ? 'STRONG' : score >= 45 ? 'MODERATE' : 'WEAK';
    const signals: string[] = [];
    if (techMentioned.length > 0) signals.push(`Candidate mentioned ${techMentioned.slice(0, 3).join(', ')} — ask a specific follow-up about one of these technologies`);
    if (mentionedProject) signals.push(`Candidate referenced a project — dig into the technical decisions or challenges`);

    const directive = quality === 'STRONG'
      ? 'ESCALATE: Ask a harder follow-up, introduce edge cases, or probe depth on what they mentioned.'
      : quality === 'WEAK'
      ? 'SIMPLIFY: Ask a clarifying question or reframe the topic at a lower difficulty level.'
      : 'MAINTAIN: Follow up concretely on what they mentioned, ask for a real-world example.';

    return `[ADAPTIVE SIGNAL | Quality: ${quality} (${score}/100) | ${signals.join(' | ')} | ${directive}]`;
  }

  async initInterview(profile: UserProfile): Promise<{ text: string, audio?: string }> {
    this.profile = profile;
    this.fallbackQuestionIndex = 0;
    const persona = PERSONAS.find(p => p.id === profile.interviewerPersonaId) || PERSONAS[0];
    const skills = profile.techStack.length ? profile.techStack.join(', ') : 'skills inferred from resume';

    // Build structured resume context from parsed profile if available, else fall back to raw text
    const rp = profile.resumeProfile;
    const resumeContext = rp
      ? `STRUCTURED CANDIDATE PROFILE:
- Experience: ${rp.yearsOfExperience} year(s) (${rp.seniorityLevel})
- Education: ${rp.education.map(e => `${e.degree} in ${e.major} — ${e.institution} (${e.year})`).join('; ') || 'Not provided'}
- Certifications: ${rp.certifications.join(', ') || 'None mentioned'}
- Key Projects (reference these by name in questions):
${rp.projects.map(p => `  * ${p.name} [${p.technologies.join(', ')}]: ${p.impact}`).join('\n') || '  None extracted'}
- Professional Summary: ${rp.summary}`
      : `Resume text: ${profile.resumeText ? profile.resumeText.substring(0, 2000) : 'No resume provided'}`;

    const systemInstruction = `You are ${persona.name}, a ${persona.role}. Your interviewing style: ${persona.style}.

ADAPTIVE INTERVIEW PROTOCOL:
Each candidate message will start with [ADAPTIVE SIGNAL]. You MUST use it:
- STRONG answer → escalate difficulty, explore edge cases, ask for deeper technical reasoning
- WEAK answer → simplify, reframe, ask a smaller clarifying question first
- MODERATE answer → maintain difficulty, ask for a concrete example or specific outcome
- If specific technologies are flagged → follow up on exactly those
- If a project is flagged → ask about the technical challenge, a specific decision, or a tradeoff made
Never announce difficulty levels. Never say "great answer" or "good job." Stay professional and concise.

PERSONALIZED QUESTION STRATEGY:
${resumeContext}
When available, ask questions that reference the candidate's specific projects by name, their exact tech stack, and their education/certifications. This creates a personalised interview, not a generic one.

INTERVIEW FLOW:
1. Warm greeting → self-introduction
2. Probe a specific named project from their resume (if available)
3. Technical depth questions on their actual stack (${skills})
4. Role-specific depth and system design (based on ${profile.role || profile.rolePreference})
5. Behavioral round — STAR-style, tied to their actual work experience
6. End every response with exactly ONE clear question. Keep responses concise.

SESSION:
- Goal: ${profile.interviewGoal}
- Target Role: ${profile.role || 'General software role'}
- Target Company: ${profile.targetCompany || 'General Industry'}
- Seniority: ${profile.experienceLevel}
- Job Description: ${profile.jobDescription ? profile.jobDescription.substring(0, 800) : 'Not provided'}`;

    try {
      const ai = this.getAI();
      this.chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction, temperature: 0.8 }
      });
      const response = await this.chat.sendMessage({ message: 'SYSTEM_SIGNAL: Candidate has entered the room. Begin with a short warm greeting and ask for their self-introduction.' });
      const text = response.text || this.getFallbackQuestion();
      return { text };
    } catch {
      this.chat = null;
      // Gemini failed — try Ollama before falling back to scripted questions
      try {
        const model = await this.getOllamaModel();
        if (model) {
          this.ollamaMessages = [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: 'SYSTEM_SIGNAL: Candidate has entered the room. Begin with a short warm greeting and ask for their self-introduction.' },
          ];
          const reply = await this.ollamaChat(this.ollamaMessages);
          this.ollamaMessages.push({ role: 'assistant', content: reply });
          return { text: reply || this.getFallbackQuestion() };
        }
      } catch {}
      return { text: this.getFallbackQuestion() };
    }
  }

  async sendMessage(message: string): Promise<{ text: string, audio?: string }> {
    const signal = this.evaluateAnswerLocally(message);
    const adaptiveMessage = `${signal}\n\nCandidate answer: ${message}`;

    // Primary: Gemini chat
    if (this.chat) {
      try {
        const response = await this.chat.sendMessage({ message: adaptiveMessage });
        const text = response.text || this.getFallbackQuestion(message);
        return { text };
      } catch {
        this.chat = null;
      }
    }

    // Fallback: Ollama (keep the full conversation history)
    if (this.ollamaMessages.length > 0) {
      try {
        this.ollamaMessages.push({ role: 'user', content: adaptiveMessage });
        const reply = await this.ollamaChat(this.ollamaMessages);
        this.ollamaMessages.push({ role: 'assistant', content: reply });
        return { text: reply || this.getFallbackQuestion(message) };
      } catch {}
    }

    return { text: this.getFallbackQuestion(message) };
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

    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Perform an exhaustive professional evaluation based on this interview transcript. 
        If the transcript is short, provide the best possible estimation of readiness.
        Return a valid JSON object matching the required schema.

        TRANSCRIPT:
        ${history}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["summary", "overallScore", "label", "metrics", "speechAnalysis", "roadmap", "questionBreakdown"],
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
              roadmap: {
                type: Type.OBJECT,
                properties: {
                  technical: { type: Type.ARRAY, items: { type: Type.STRING } },
                  communication: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              improvementPlan: {
                type: Type.OBJECT,
                properties: {
                  prioritySkills: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        skill: { type: Type.STRING },
                        currentLevel: { type: Type.STRING },
                        targetLevel: { type: Type.STRING },
                        resources: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    }
                  },
                  weeklyPlan: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        week: { type: Type.STRING },
                        focus: { type: Type.STRING },
                        tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    }
                  },
                  practiceQuestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        topic: { type: Type.STRING },
                        question: { type: Type.STRING },
                        hint: { type: Type.STRING }
                      }
                    }
                  },
                  quickWins: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        }
      });
      const cleanText = response.text.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleanText);
      return {
        duration: parsed.duration || 'Practice session',
        behavioralAnalysis: parsed.behavioralAnalysis || {
          score: parsed.metrics?.communication || 70,
          eyeContact: { score: 70, percentage: 'N/A', avg: 'N/A' },
          bodyLanguage: { score: 70, posture: 'Not measured', gestures: 'Not measured' },
          facialExpression: { score: 70, engagement: 'Not measured', nervousness: 'Not measured' },
          setupQuality: { score: 70, lighting: 'Not measured' },
          energyLevel: { score: 70, consistency: 'Not measured' }
        },
        speechAnalysis: {
          clarityScore: parsed.speechAnalysis?.clarityScore || parsed.metrics?.fluency || 70,
          pace: parsed.speechAnalysis?.pace || 'Optimal',
          fillerWordUsage: parsed.speechAnalysis?.fillerWordUsage || 'Moderate',
          pronunciationGaps: parsed.speechAnalysis?.pronunciationGaps || []
        },
        roadmap: {
          technical: parsed.roadmap?.technical || ['Review the questions you answered weakly and practice concise examples.'],
          communication: parsed.roadmap?.communication || ['Use a clear setup, action, result structure in longer answers.']
        },
        improvementPlan: parsed.improvementPlan || undefined,
        ...parsed
      };
    } catch {
      try {
        return await this.generateReportWithOllama(history);
      } catch {
        return this.buildFallbackReport(history);
      }
    }
  }

  private async generateReportWithOllama(history: string): Promise<Report> {
    const prompt = `You are an expert interview evaluator. Analyze the transcript below and return ONLY a valid JSON object — no other text.

JSON structure:
{
  "summary": "<overall 2-sentence summary>",
  "overallScore": <0-100>,
  "label": "<Beginner|Intermediate|Interview Ready|Strong>",
  "duration": "Practice session",
  "metrics": {
    "technicalAccuracy": <0-100>, "communication": <0-100>,
    "problemSolving": <0-100>, "confidence": <0-100>,
    "pronunciation": <0-100>, "fluency": <0-100>
  },
  "speechAnalysis": {
    "clarityScore": <0-100>,
    "pace": "<Too Fast|Too Slow|Optimal>",
    "fillerWordUsage": "<High|Moderate|Low>",
    "pronunciationGaps": []
  },
  "roadmap": {
    "technical": ["<tip1>", "<tip2>"],
    "communication": ["<tip1>", "<tip2>"]
  },
  "questionBreakdown": [
    {
      "questionText": "...", "userAnswer": "...", "idealAnswer": "...",
      "type": "Technical", "difficulty": "<Easy|Medium|Hard>",
      "correctness": <0-100>, "duration": "N/A",
      "tag": "<Excellent|Partial|Weak>",
      "feedback": { "whatWentWell": ["..."], "areasToImprove": ["..."] },
      "interviewerNotes": "..."
    }
  ]
}

TRANSCRIPT:
${history.substring(0, 12000)}`;

    const raw = await this.ollamaChat([{ role: 'user', content: prompt }], true);
    const parsed = this.parseOllamaJson(raw);
    return {
      duration: 'Practice session',
      behavioralAnalysis: {
        score: parsed.metrics?.communication ?? 70,
        eyeContact: { score: 70, percentage: 'N/A', avg: 'N/A' },
        bodyLanguage: { score: 70, posture: 'Not measured', gestures: 'Not measured' },
        facialExpression: { score: 70, engagement: 'Not measured', nervousness: 'Not measured' },
        setupQuality: { score: 70, lighting: 'Not measured' },
        energyLevel: { score: 70, consistency: 'Not measured' },
      },
      speechAnalysis: {
        clarityScore: parsed.speechAnalysis?.clarityScore ?? parsed.metrics?.fluency ?? 70,
        pace: parsed.speechAnalysis?.pace ?? 'Optimal',
        fillerWordUsage: parsed.speechAnalysis?.fillerWordUsage ?? 'Moderate',
        pronunciationGaps: parsed.speechAnalysis?.pronunciationGaps ?? [],
      },
      roadmap: {
        technical: parsed.roadmap?.technical ?? ['Review your weakest answers and add concrete examples.'],
        communication: parsed.roadmap?.communication ?? ['Use clear setup-action-result structure.'],
      },
      improvementPlan: parsed.improvementPlan,
      ...parsed,
    };
  }

  async parseResumeIntelligence(resumeText: string, jobDescription?: string, techStack?: string[]): Promise<{ resumeProfile: ResumeProfile; jobMatches: JobMatch[] }> {
    try {
      return await this.parseResumeIntelligenceGemini(resumeText, jobDescription, techStack);
    } catch (e) {
      console.error('[ResumeAnalyzer] Gemini parseResumeIntelligence failed:', e);
      return this.parseResumeIntelligenceOllama(resumeText, jobDescription);
    }
  }

  private async parseResumeIntelligenceGemini(resumeText: string, jobDescription?: string, techStack?: string[]): Promise<{ resumeProfile: ResumeProfile; jobMatches: JobMatch[] }> {
    const ai = this.getAI();
    const jdPart = jobDescription?.trim() ? `\n\nJOB DESCRIPTION:\n${jobDescription.substring(0, 2000)}` : '';
    const stackPart = techStack?.length ? `\n\nEXTRACTED SKILLS: ${techStack.join(', ')}` : '';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract structured intelligence from this resume, then recommend the top 5 best-fit job roles based on the candidate's background. Be specific and accurate.${jdPart}${stackPart}\n\nRESUME:\n${resumeText.substring(0, 10000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['resumeProfile', 'jobMatches'],
          properties: {
            resumeProfile: {
              type: Type.OBJECT,
              required: ['yearsOfExperience', 'seniorityLevel', 'summary', 'projects', 'education', 'certifications'],
              properties: {
                yearsOfExperience: { type: Type.NUMBER },
                seniorityLevel: { type: Type.STRING },
                summary: { type: Type.STRING },
                projects: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                      impact: { type: Type.STRING }
                    }
                  }
                },
                education: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      degree: { type: Type.STRING },
                      institution: { type: Type.STRING },
                      year: { type: Type.STRING },
                      major: { type: Type.STRING }
                    }
                  }
                },
                certifications: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            jobMatches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING },
                  matchScore: { type: Type.NUMBER },
                  matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  whyMatch: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text.replace(/```json|```/gi, '').trim());
    const rp: ResumeProfile = {
      yearsOfExperience: parsed.resumeProfile?.yearsOfExperience ?? 0,
      seniorityLevel: parsed.resumeProfile?.seniorityLevel ?? 'Unknown',
      summary: parsed.resumeProfile?.summary ?? '',
      projects: parsed.resumeProfile?.projects ?? [],
      education: parsed.resumeProfile?.education ?? [],
      certifications: parsed.resumeProfile?.certifications ?? [],
    };
    const jm: JobMatch[] = (parsed.jobMatches ?? []).map((m: any) => ({
      role: m.role ?? 'Unknown Role',
      matchScore: m.matchScore ?? 0,
      matchedSkills: m.matchedSkills ?? [],
      missingSkills: m.missingSkills ?? [],
      whyMatch: m.whyMatch ?? '',
    }));
    return { resumeProfile: rp, jobMatches: jm };
  }

  private async parseResumeIntelligenceOllama(resumeText: string, jobDescription?: string): Promise<{ resumeProfile: ResumeProfile; jobMatches: JobMatch[] }> {
    const jdPart = jobDescription?.trim() ? `\n\nJOB DESCRIPTION:\n${jobDescription.substring(0, 2000)}` : '';
    const prompt = `Extract information from this resume and suggest the top 5 best-fit job roles. Return ONLY a valid JSON object — no other text.

{
  "resumeProfile": {
    "yearsOfExperience": <number>,
    "seniorityLevel": "<Junior|Mid-level|Senior|Lead>",
    "summary": "<2-3 sentence professional summary>",
    "projects": [{"name":"","description":"","technologies":[],"impact":""}],
    "education": [{"degree":"","institution":"","year":"","major":""}],
    "certifications": []
  },
  "jobMatches": [
    {"role":"","matchScore":<0-100>,"matchedSkills":[],"missingSkills":[],"whyMatch":""}
  ]
}

RESUME:\n${resumeText.substring(0, 10000)}${jdPart}`;

    const raw = await this.ollamaChat([{ role: 'user', content: prompt }], true);
    const parsed = this.parseOllamaJson(raw);
    const rp: ResumeProfile = {
      yearsOfExperience: parsed.resumeProfile?.yearsOfExperience ?? 0,
      seniorityLevel: parsed.resumeProfile?.seniorityLevel ?? 'Unknown',
      summary: parsed.resumeProfile?.summary ?? '',
      projects: parsed.resumeProfile?.projects ?? [],
      education: parsed.resumeProfile?.education ?? [],
      certifications: parsed.resumeProfile?.certifications ?? [],
    };
    const jm: JobMatch[] = (parsed.jobMatches ?? []).map((m: any) => ({
      role: m.role ?? 'Unknown Role',
      matchScore: m.matchScore ?? 0,
      matchedSkills: m.matchedSkills ?? [],
      missingSkills: m.missingSkills ?? [],
      whyMatch: m.whyMatch ?? '',
    }));
    return { resumeProfile: rp, jobMatches: jm };
  }

  async analyzeResume(resumeText: string, jobDescription?: string, techStack?: string[]): Promise<ResumeAnalysis> {
    let geminiError: unknown;
    try {
      return await this.analyzeResumeGemini(resumeText, jobDescription, techStack);
    } catch (e) {
      geminiError = e;
      console.error('[ResumeAnalyzer] Gemini analyzeResume failed:', e);
    }
    try {
      return await this.analyzeResumeOllama(resumeText, jobDescription);
    } catch (e) {
      console.error('[ResumeAnalyzer] Ollama analyzeResume failed:', e);
      const msg = geminiError instanceof Error ? geminiError.message : String(geminiError);
      throw new Error(`Gemini: ${msg}`);
    }
  }

  private async analyzeResumeGemini(resumeText: string, jobDescription?: string, techStack?: string[]): Promise<ResumeAnalysis> {
    const ai = this.getAI();
    const jdPart = jobDescription?.trim() ? `\n\nJOB DESCRIPTION:\n${jobDescription.substring(0, 3000)}` : '';
    const stackPart = techStack?.length ? `\n\nEXTRACTED SKILLS: ${techStack.join(', ')}` : '';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert resume reviewer and interview coach. Analyze this resume for interview readiness, ATS compatibility, and skill gaps vs the job description (if provided). Return honest, specific, actionable feedback.${jdPart}${stackPart}\n\nRESUME:\n${resumeText.substring(0, 8000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['overallScore', 'atsScore', 'label', 'strengths', 'weaknesses', 'skillGaps', 'improvementTips', 'keyHighlights'],
          properties: {
            overallScore: { type: Type.NUMBER },
            atsScore: { type: Type.NUMBER },
            label: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyHighlights: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text.replace(/```json|```/gi, '').trim());
    return {
      overallScore: parsed.overallScore ?? 0,
      atsScore: parsed.atsScore ?? 0,
      label: parsed.label ?? 'Unrated',
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      skillGaps: parsed.skillGaps ?? [],
      improvementTips: parsed.improvementTips ?? [],
      keyHighlights: parsed.keyHighlights ?? [],
    } as ResumeAnalysis;
  }

  private async analyzeResumeOllama(resumeText: string, jobDescription?: string): Promise<ResumeAnalysis> {
    const jdPart = jobDescription?.trim() ? `\n\nJOB DESCRIPTION:\n${jobDescription.substring(0, 3000)}` : '';
    const prompt = `You are an expert resume reviewer. Analyze this resume for interview readiness and ATS compatibility. Return ONLY a valid JSON object — no other text.

{
  "overallScore": <0-100>,
  "atsScore": <0-100 for ATS keyword match>,
  "label": "<Excellent|Good|Fair|Needs Work>",
  "strengths": ["<strength1>","<strength2>","<strength3>"],
  "weaknesses": ["<weakness1>","<weakness2>","<weakness3>"],
  "skillGaps": ["<missing skill>"],
  "improvementTips": ["<actionable tip1>","<tip2>","<tip3>","<tip4>","<tip5>"],
  "keyHighlights": ["<achievement1>","<achievement2>"]
}

RESUME:\n${resumeText.substring(0, 8000)}${jdPart}`;

    const raw = await this.ollamaChat([{ role: 'user', content: prompt }], true);
    const parsed = this.parseOllamaJson(raw);
    return {
      overallScore: parsed.overallScore ?? 0,
      atsScore: parsed.atsScore ?? 0,
      label: parsed.label ?? 'Unrated',
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      skillGaps: parsed.skillGaps ?? [],
      improvementTips: parsed.improvementTips ?? [],
      keyHighlights: parsed.keyHighlights ?? [],
    };
  }

  async playAudio(base64: string) {
    this.stopAudio();
    const ctx = await this.getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
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
    const aligned = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const dataInt16 = new Int16Array(aligned);
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
