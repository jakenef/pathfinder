export type SpeechRecognitionCallback = (transcript: string, isFinal: boolean) => void;
export type SpeechErrorCallback = (error: string) => void;

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInterface;
    webkitSpeechRecognition: new () => SpeechRecognitionInterface;
  }
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognitionInterface | null = null;
  private onTranscriptCallback: SpeechRecognitionCallback | null = null;
  private onErrorCallback: SpeechErrorCallback | null = null;
  private isRecognizing: boolean = false;

  constructor() {
    if (this.isSupported()) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (this.onTranscriptCallback) {
        if (finalTranscript) {
          this.onTranscriptCallback(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          this.onTranscriptCallback(interimTranscript.trim(), false);
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        return;
      }

      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }

      if (event.error === 'not-allowed') {
        this.stop();
      }
    };

    this.recognition.onend = () => {
      this.isRecognizing = false;
    };

    this.recognition.onstart = () => {
      this.isRecognizing = true;
    };
  }

  start(
    onTranscript: SpeechRecognitionCallback,
    onError: SpeechErrorCallback
  ): boolean {
    if (!this.recognition || this.isRecognizing) {
      return false;
    }

    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('Failed to start speech recognition');
      }
      return false;
    }
  }

  stop(): string | null {
    if (!this.recognition || !this.isRecognizing) {
      return null;
    }

    try {
      this.recognition.stop();
      this.isRecognizing = false;
      return null;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      return null;
    }
  }

  abort(): void {
    if (!this.recognition) return;

    try {
      this.recognition.abort();
      this.isRecognizing = false;
    } catch (error) {
      console.error('Error aborting speech recognition:', error);
    }
  }

  getIsRecognizing(): boolean {
    return this.isRecognizing;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
