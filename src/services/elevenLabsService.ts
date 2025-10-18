const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
// Default fallback voice (Antoni)
const DEFAULT_VOICE_ID = "ErXwobaYiN019PkySvjV";

export async function textToSpeech(
  text: string,
  voiceId?: string
): Promise<ArrayBuffer> {
  if (
    !ELEVENLABS_API_KEY ||
    ELEVENLABS_API_KEY === "your_elevenlabs_api_key_here"
  ) {
    throw new Error(
      "ElevenLabs API key not configured. Please add your API key to the .env file."
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${
        voiceId || DEFAULT_VOICE_ID
      }`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY.trim(),
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.detail?.message ||
        errorData.message ||
        `API error: ${response.status}`;

      if (response.status === 401) {
        throw new Error(
          'Invalid API key. Please check your ElevenLabs API key in the .env file. Keys should start with "sk_" and be around 32+ characters.'
        );
      }

      throw new Error(errorMessage);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    throw error;
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;

  constructor() {
    if (typeof window !== "undefined" && "AudioContext" in window) {
      this.audioContext = new AudioContext();
    }
  }

  async play(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error("AudioContext not available");
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const buffer = await this.audioContext.decodeAudioData(
      audioBuffer.slice(0)
    );
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1;
    source.connect(this.audioContext.destination);

    return new Promise<void>((resolve) => {
      source.onended = () => {
        this.currentSource = null;
        this.isPlaying = false;
        resolve();
      };

      this.currentSource = source;
      this.isPlaying = true;
      source.start(0);
    });
  }

  async enqueue(audioBuffer: ArrayBuffer): Promise<void> {
    this.audioQueue.push(audioBuffer);
    if (!this.isPlaying) {
      await this.playQueue();
    }
  }

  private async playQueue(): Promise<void> {
    while (this.audioQueue.length > 0) {
      const buffer = this.audioQueue.shift();
      if (buffer) {
        try {
          await this.play(buffer);
        } catch (error) {
          console.error("Error playing audio from queue:", error);
        }
      }
    }
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (error) {
        console.error("Error stopping audio:", error);
      }
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioPlayer = new AudioPlayer();
