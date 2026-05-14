import { pipeline } from '@huggingface/transformers';

type ASRPipeline = Awaited<ReturnType<typeof pipeline>>;

class WhisperService {
  private pipe: ASRPipeline | null = null;
  private loadPromise: Promise<void> | null = null;

  load(onProgress?: (pct: number) => void): Promise<void> {
    if (this.pipe) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny',
      {
        progress_callback: (info: any) => {
          if (info.status === 'progress' && onProgress) {
            onProgress(Math.round(info.progress ?? 0));
          }
        },
      }
    )
      .then(pipe => {
        this.pipe = pipe;
      })
      .catch(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  isReady() {
    return this.pipe !== null;
  }

  async transcribe(blob: Blob): Promise<string> {
    if (!this.pipe) throw new Error('Whisper not ready');

    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new AudioContext({ sampleRate: 16000 });
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } finally {
      await ctx.close();
    }

    const float32 = audioBuffer.getChannelData(0);
    const result = await (this.pipe as any)(float32, {
      sampling_rate: 16000,
      task: 'transcribe',
    });

    const text = Array.isArray(result) ? result[0]?.text : (result as any)?.text;
    return (text || '').trim();
  }
}

export const whisperService = new WhisperService();
