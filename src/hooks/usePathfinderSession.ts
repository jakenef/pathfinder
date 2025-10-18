import { useState, useCallback, useRef, useEffect } from 'react';
import type { SessionState, Message, Major, AudioState } from '../types';
import { INTAKE_QUESTIONS } from '../types';
import { speechRecognitionService } from '../services/speechService';
import { textToSpeech, audioPlayer } from '../services/elevenLabsService';
import { sendMessage, buildIntakeContext, buildMajorSuggestionContext, buildCareerSuggestionContext, buildSummaryContext } from '../services/openaiService';
import { getMajors, getCareersForMajor } from '../services/dataService';
import { scoreMajors, updateUserProfile } from '../services/matchingService';

const initialSessionState: SessionState = {
  phase: 'welcome',
  currentQuestionIndex: 0,
  messages: [],
  userProfile: {
    interests: [],
    strengths: [],
    values: [],
    workStyle: [],
    responses: {}
  },
  suggestedMajors: [],
  selectedMajor: null,
  suggestedCareers: [],
  conversationHistory: [],
  isAISpeaking: false,
  isProcessing: false
};

export function usePathfinderSession() {
  const [session, setSession] = useState<SessionState>(initialSessionState);
  const [audioState, setAudioState] = useState<AudioState>({
    isRecording: false,
    isPlaying: false,
    isMicAvailable: speechRecognitionService.isSupported()
  });
  const [interimTranscript, setInterimTranscript] = useState('');
  const [, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const transcriptRef = useRef('');

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date()
    };

    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      conversationHistory: [...prev.conversationHistory, { role, content }]
    }));
  }, []);

  const speakText = useCallback(async (text: string) => {
    try {
      setSession(prev => ({ ...prev, isAISpeaking: true }));
      setAudioState(prev => ({ ...prev, isPlaying: true }));

      const audioBuffer = await textToSpeech(text);
      await audioPlayer.play(audioBuffer);

      setSession(prev => ({ ...prev, isAISpeaking: false }));
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setSession(prev => ({ ...prev, isAISpeaking: false }));
      setAudioState(prev => ({ ...prev, isPlaying: false }));
      setError('Voice output unavailable. Continuing with text only.');
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  const processAIResponse = useCallback(async (contextBuilder: () => string, options?: { hideMessage?: boolean }) => {
    try {
      setSession(prev => ({ ...prev, isProcessing: true }));

      const context = contextBuilder();
      const response = await sendMessage(session.conversationHistory, context);

      if (!options?.hideMessage) {
        addMessage('assistant', response);
      }
      await speakText(response);

      setSession(prev => ({ ...prev, isProcessing: false }));
    } catch (error: any) {
      console.error('Error processing AI response:', error);
      setSession(prev => ({ ...prev, isProcessing: false }));
      setError(error.message || 'Failed to get response. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  }, [session.conversationHistory, addMessage, speakText]);

  const handleUserMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || session.isProcessing || session.isAISpeaking) return;

    addMessage('user', userMessage);

    if (session.phase === 'intake') {
      const currentQuestion = INTAKE_QUESTIONS[session.currentQuestionIndex];
      const updatedProfile = updateUserProfile(session.userProfile, currentQuestion.id, userMessage);

      setSession(prev => ({
        ...prev,
        userProfile: updatedProfile
      }));

      if (session.currentQuestionIndex < INTAKE_QUESTIONS.length - 1) {
        const nextIndex = session.currentQuestionIndex + 1;
        setSession(prev => ({ ...prev, currentQuestionIndex: nextIndex }));

        await processAIResponse(() =>
          buildIntakeContext(nextIndex, INTAKE_QUESTIONS.length, updatedProfile)
        );
      } else {
        setSession(prev => ({ ...prev, phase: 'major_suggestions' }));

        const allMajors = await getMajors();
        const scoredMajors = scoreMajors(allMajors, updatedProfile);

        setSession(prev => ({
          ...prev,
          suggestedMajors: scoredMajors
        }));

        await processAIResponse(() =>
          buildMajorSuggestionContext(updatedProfile, scoredMajors),
          { hideMessage: true }
        );
      }
    } else if (session.phase === 'major_suggestions' || session.phase === 'career_suggestions') {
      await processAIResponse(() => {
        if (session.phase === 'major_suggestions' && session.suggestedMajors.length > 0) {
          return buildMajorSuggestionContext(session.userProfile, session.suggestedMajors);
        } else if (session.phase === 'career_suggestions' && session.selectedMajor && session.suggestedCareers.length > 0) {
          return buildCareerSuggestionContext(session.userProfile, session.selectedMajor, session.suggestedCareers);
        }
        return '';
      });
    }
  }, [session, addMessage, processAIResponse]);

  const startSession = useCallback(async () => {
    setSession(prev => ({ ...prev, phase: 'intake' }));

    const firstQuestion = INTAKE_QUESTIONS[0].question;
    const combinedMessage = `Hi! I'm Pathfinder, here to help you discover majors and careers that fit you. Let's start: ${firstQuestion}`;

    addMessage('assistant', combinedMessage);
    await speakText(combinedMessage);
  }, [addMessage, speakText]);

  const selectMajor = useCallback(async (major: Major) => {
    setSession(prev => ({
      ...prev,
      selectedMajor: major,
      phase: 'career_suggestions'
    }));

    const careers = await getCareersForMajor(major.id);
    setSession(prev => ({
      ...prev,
      suggestedCareers: careers
    }));

    const message = `Great choice! ${major.name} is an excellent fit for you. Let me share some exciting career paths you can pursue with this major.`;
    addMessage('assistant', message);
    await speakText(message);

    await new Promise(resolve => setTimeout(resolve, 1000));

    await processAIResponse(() =>
      buildCareerSuggestionContext(session.userProfile, major, careers),
      { hideMessage: true }
    );
  }, [session.userProfile, addMessage, speakText, processAIResponse]);

  const goToSummary = useCallback(async () => {
    setSession(prev => ({ ...prev, phase: 'summary' }));

    if (session.selectedMajor) {
      await processAIResponse(() =>
        buildSummaryContext(session.userProfile, session.selectedMajor!, session.suggestedCareers)
      );
    }
  }, [session, processAIResponse]);

  const restartSession = useCallback(() => {
    audioPlayer.stop();
    speechRecognitionService.abort();
    setSession(initialSessionState);
    setInterimTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

  const toggleRecording = useCallback((shouldRecord: boolean) => {
    if (session.isAISpeaking || session.isProcessing) return;

    if (shouldRecord) {
      transcriptRef.current = '';
      setInterimTranscript('');
      setFinalTranscript('');

      const started = speechRecognitionService.start(
        (transcript, isFinal) => {
          if (isFinal) {
            transcriptRef.current += transcript + ' ';
            setFinalTranscript(transcriptRef.current.trim());
            setInterimTranscript('');
          } else {
            setInterimTranscript(transcript);
          }
        },
        (error) => {
          setError(`Microphone error: ${error}`);
          setAudioState(prev => ({ ...prev, isRecording: false }));
          setTimeout(() => setError(null), 3000);
        }
      );

      if (started) {
        setAudioState(prev => ({ ...prev, isRecording: true }));
      }
    } else {
      speechRecognitionService.stop();
      setAudioState(prev => ({ ...prev, isRecording: false }));

      const fullTranscript = transcriptRef.current.trim();
      if (fullTranscript) {
        handleUserMessage(fullTranscript);
      }

      setInterimTranscript('');
      setFinalTranscript('');
      transcriptRef.current = '';
    }
  }, [session.isAISpeaking, session.isProcessing, handleUserMessage]);

  useEffect(() => {
    return () => {
      audioPlayer.stop();
      speechRecognitionService.abort();
    };
  }, []);

  return {
    session,
    audioState,
    interimTranscript,
    error,
    startSession,
    handleUserMessage,
    selectMajor,
    goToSummary,
    restartSession,
    toggleRecording
  };
}
