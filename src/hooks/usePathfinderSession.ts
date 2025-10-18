import { useState, useCallback, useRef, useEffect } from "react";
import type { SessionState, Message, Major, AudioState } from "../types";
import { INTAKE_QUESTIONS } from "../types";
import { speechRecognitionService } from "../services/speechService";
import { textToSpeech, audioPlayer } from "../services/elevenLabsService";
import { cleanTextForTTS } from "../lib/textCleaner";
import {
  sendMessage,
  buildIntakeContext,
  buildMajorSuggestionContext,
  buildCareerSuggestionContext,
  buildSummaryContext,
} from "../services/openaiService";
import { getMajors, getCareersForMajor } from "../services/dataService";
import { scoreMajors, updateUserProfile } from "../services/matchingService";
import {
  calculateRIASECScore,
  getTopRIASECCodes,
  getRIASECDescription,
  generateDemoRIASECScore,
} from "../services/riasecService";
import { findMatchingCareers } from "../services/careerMatchingService";
import { getMajorsForCareer } from "../services/careerMajorMatchingService";
import { enrichCareersWithConversation } from "../services/conversationCareerService";

const initialSessionState: SessionState = {
  phase: "welcome",
  currentQuestionIndex: 0,
  messages: [],
  userProfile: {
    interests: [],
    strengths: [],
    values: [],
    workStyle: [],
    responses: {},
  },
  suggestedMajors: [],
  selectedMajor: null,
  suggestedCareers: [],
  matchedSOCCareers: [],
  expandedCareerCode: null,
  careerSpecificMajors: {},
  conversationHistory: [],
  isAISpeaking: false,
  isProcessing: false,
  selectedVoiceId: null,
};

export function usePathfinderSession() {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [session, setSession] = useState<SessionState>(initialSessionState);
  const [audioState, setAudioState] = useState<AudioState>({
    isRecording: false,
    isPlaying: false,
    isMicAvailable: speechRecognitionService.isSupported(),
  });
  const [interimTranscript, setInterimTranscript] = useState("");
  const [, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentSpeakingMessageId, setCurrentSpeakingMessageId] = useState<
    string | null
  >(null);

  const transcriptRef = useRef("");

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      const message: Message = {
        id: `${Date.now()}-${Math.random()}`,
        role,
        content,
        timestamp: new Date(),
      };

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
        conversationHistory: [...prev.conversationHistory, { role, content }],
      }));
    },
    []
  );

  const speakText = useCallback(
    async (text: string, messageId?: string) => {
      if (!isVoiceEnabled) return;
      try {
        setSession((prev) => ({ ...prev, isAISpeaking: true }));
        setAudioState((prev) => ({ ...prev, isPlaying: true }));
        if (messageId) {
          setCurrentSpeakingMessageId(messageId);
        }

        // Clean the text before sending to TTS
        const cleanedText = cleanTextForTTS(text);
        const audioBuffer = await textToSpeech(
          cleanedText,
          session.selectedVoiceId || undefined
        );
        await audioPlayer.play(audioBuffer);

        setSession((prev) => ({ ...prev, isAISpeaking: false }));
        setAudioState((prev) => ({ ...prev, isPlaying: false }));
        setCurrentSpeakingMessageId(null);
      } catch (error) {
        console.error("Error with text-to-speech:", error);
        setSession((prev) => ({ ...prev, isAISpeaking: false }));
        setAudioState((prev) => ({ ...prev, isPlaying: false }));
        setCurrentSpeakingMessageId(null);
        setError("Voice output unavailable. Continuing with text only.");
        setTimeout(() => setError(null), 3000);
      }
    },
    [session.selectedVoiceId, isVoiceEnabled]
  );

  const processAIResponse = useCallback(
    async (
      contextBuilder: () => string,
      options?: {
        hideMessage?: boolean;
        conversationHistory?: Array<{
          role: "user" | "assistant";
          content: string;
        }>;
      }
    ) => {
      try {
        setSession((prev) => ({ ...prev, isProcessing: true }));

        const context = contextBuilder();
        const historyToUse =
          options?.conversationHistory || session.conversationHistory;
        const response = await sendMessage(historyToUse, context);

        let messageId: string | undefined;
        if (!options?.hideMessage) {
          const message: Message = {
            id: `${Date.now()}-${Math.random()}`,
            role: "assistant",
            content: response,
            timestamp: new Date(),
          };
          messageId = message.id;

          setSession((prev) => ({
            ...prev,
            messages: [...prev.messages, message],
            conversationHistory: [
              ...prev.conversationHistory,
              { role: "assistant", content: response },
            ],
          }));
        }
        await speakText(response, messageId);

        setSession((prev) => ({ ...prev, isProcessing: false }));
      } catch (error: any) {
        console.error("Error processing AI response:", error);
        setSession((prev) => ({ ...prev, isProcessing: false }));
        setError(error.message || "Failed to get response. Please try again.");
        setTimeout(() => setError(null), 5000);
      }
    },
    [session.conversationHistory, speakText]
  );

  const handleUserMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || session.isProcessing || session.isAISpeaking)
        return;

      addMessage("user", userMessage);

      // Create updated conversation history immediately
      const updatedHistory = [
        ...session.conversationHistory,
        { role: "user" as const, content: userMessage },
      ];

      if (session.phase === "intake") {
        const currentQuestion = INTAKE_QUESTIONS[session.currentQuestionIndex];
        const updatedProfile = updateUserProfile(
          session.userProfile,
          currentQuestion.id,
          userMessage
        );

        setSession((prev) => ({
          ...prev,
          userProfile: updatedProfile,
        }));

        if (session.currentQuestionIndex < INTAKE_QUESTIONS.length - 1) {
          const nextIndex = session.currentQuestionIndex + 1;
          setSession((prev) => ({ ...prev, currentQuestionIndex: nextIndex }));

          await processAIResponse(
            () =>
              buildIntakeContext(
                nextIndex,
                INTAKE_QUESTIONS.length,
                updatedProfile
              ),
            { conversationHistory: updatedHistory }
          );
        } else {
          // All intake questions complete - calculate RIASEC score
          const riasecScore = calculateRIASECScore(updatedProfile);
          const topCodes = getTopRIASECCodes(riasecScore);
          const description = getRIASECDescription(riasecScore);

          // Log RIASEC results
          console.log("=== RIASEC SCORE RESULTS ===");
          console.log("Realistic (hands-on):", riasecScore.realistic);
          console.log("Investigative (analytical):", riasecScore.investigative);
          console.log("Artistic (creative):", riasecScore.artistic);
          console.log("Social (helping):", riasecScore.social);
          console.log("Enterprising (leading):", riasecScore.enterprising);
          console.log("Conventional (organized):", riasecScore.conventional);
          console.log("Top RIASEC Code:", topCodes);
          console.log("Description:", description);
          console.log("===========================");

          // Update profile with RIASEC score
          const profileWithRIASEC = {
            ...updatedProfile,
            riasecScore,
          };

          // Find matching careers based on RIASEC score
          const riasecCareers = await findMatchingCareers(riasecScore);

          // Enrich with conversation-mentioned careers
          const { careers: finalCareers, source } = await enrichCareersWithConversation(
            updatedHistory,
            riasecCareers,
            riasecScore
          );

          console.log(`\n🎯 Using careers from: ${source}`);

          setSession((prev) => ({
            ...prev,
            phase: "major_suggestions",
            userProfile: profileWithRIASEC,
            matchedSOCCareers: finalCareers,
          }));

          const allMajors = await getMajors();
          const scoredMajors = scoreMajors(allMajors, profileWithRIASEC);

          setSession((prev) => ({
            ...prev,
            suggestedMajors: scoredMajors,
          }));

          await processAIResponse(
            () => buildMajorSuggestionContext(profileWithRIASEC, scoredMajors),
            { hideMessage: true, conversationHistory: updatedHistory }
          );
        }
      } else if (
        session.phase === "major_suggestions" ||
        session.phase === "career_suggestions"
      ) {
        await processAIResponse(
          () => {
            if (
              session.phase === "major_suggestions" &&
              session.suggestedMajors.length > 0
            ) {
              return buildMajorSuggestionContext(
                session.userProfile,
                session.suggestedMajors
              );
            } else if (
              session.phase === "career_suggestions" &&
              session.selectedMajor &&
              session.suggestedCareers.length > 0
            ) {
              return buildCareerSuggestionContext(
                session.userProfile,
                session.selectedMajor,
                session.suggestedCareers
              );
            }
            return "";
          },
          { conversationHistory: updatedHistory }
        );
      }
    },
    [session, addMessage, processAIResponse]
  );

  const startSession = useCallback(async () => {
    setSession((prev) => ({ ...prev, phase: "intake" }));

    const firstQuestion = INTAKE_QUESTIONS[0].question;
    const combinedMessage = `Hi! I'm Pathfinder, here to help you discover majors and careers that fit you. Let's start: ${firstQuestion}`;

    const message: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role: "assistant",
      content: combinedMessage,
      timestamp: new Date(),
    };

    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
      conversationHistory: [
        ...prev.conversationHistory,
        { role: "assistant", content: combinedMessage },
      ],
    }));

    await speakText(combinedMessage, message.id);
  }, [speakText]);

  const selectMajor = useCallback(
    async (major: Major) => {
      // Stop any ongoing audio playback
      audioPlayer.stop();
      setSession((prev) => ({
        ...prev,
        selectedMajor: major,
        phase: "career_suggestions",
        isAISpeaking: false,
      }));
      setAudioState((prev) => ({ ...prev, isPlaying: false }));
      setCurrentSpeakingMessageId(null);

      const careers = await getCareersForMajor(major.id, major.name, major.description);
      setSession((prev) => ({
        ...prev,
        suggestedCareers: careers,
      }));

      const messageText = `Great choice! ${major.name} is an excellent fit for you. Let me share some exciting career paths you can pursue with this major.`;
      const message: Message = {
        id: `${Date.now()}-${Math.random()}`,
        role: "assistant",
        content: messageText,
        timestamp: new Date(),
      };

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
        conversationHistory: [
          ...prev.conversationHistory,
          { role: "assistant", content: messageText },
        ],
      }));

      await speakText(messageText, message.id);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await processAIResponse(
        () => buildCareerSuggestionContext(session.userProfile, major, careers),
        { hideMessage: true }
      );
    },
    [session.userProfile, speakText, processAIResponse]
  );

  const goToSummary = useCallback(async () => {
    // Stop any ongoing audio playback
    audioPlayer.stop();
    setSession((prev) => ({ ...prev, phase: "summary", isAISpeaking: false }));
    setAudioState((prev) => ({ ...prev, isPlaying: false }));
    setCurrentSpeakingMessageId(null);

    if (session.selectedMajor) {
      await processAIResponse(() =>
        buildSummaryContext(
          session.userProfile,
          session.selectedMajor!,
          session.suggestedCareers
        )
      );
    }
  }, [session, processAIResponse]);

  // skipAudio removed

  const restartSession = useCallback(() => {
    audioPlayer.stop();
    speechRecognitionService.abort();
    setSession(initialSessionState);
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);
    setCurrentSpeakingMessageId(null);
  }, []);

  const skipToDemo = useCallback(async () => {
    setSession((prev) => ({
      ...prev,
      phase: "major_suggestions",
    }));

    // Generate demo RIASEC score
    const demoRIASECScore = generateDemoRIASECScore();
    const topCodes = getTopRIASECCodes(demoRIASECScore);
    const description = getRIASECDescription(demoRIASECScore);

    console.log("=== DEMO RIASEC SCORE ===");
    console.log("Realistic (hands-on):", demoRIASECScore.realistic);
    console.log("Investigative (analytical):", demoRIASECScore.investigative);
    console.log("Artistic (creative):", demoRIASECScore.artistic);
    console.log("Social (helping):", demoRIASECScore.social);
    console.log("Enterprising (leading):", demoRIASECScore.enterprising);
    console.log("Conventional (organized):", demoRIASECScore.conventional);
    console.log("Top RIASEC Code:", topCodes);
    console.log("Description:", description);
    console.log("========================");

    // Create a demo profile
    const demoProfile = {
      interests: ["technology", "problem-solving", "creativity"],
      strengths: ["analytical thinking", "communication"],
      values: ["innovation", "impact"],
      workStyle: ["collaborative", "flexible"],
      responses: {},
      riasecScore: demoRIASECScore,
    };

    // Find matching careers based on demo RIASEC score
    const riasecCareers = await findMatchingCareers(demoRIASECScore);

    // For demo, no conversation history, so just use RIASEC careers
    const { careers: finalCareers } = await enrichCareersWithConversation(
      [],
      riasecCareers,
      demoRIASECScore
    );

    // Get and score majors
    const allMajors = await getMajors();
    const scoredMajors = scoreMajors(allMajors, demoProfile);

    setSession((prev) => ({
      ...prev,
      userProfile: demoProfile,
      matchedSOCCareers: finalCareers,
      suggestedMajors: scoredMajors,
    }));

    // Add a welcome message
    const welcomeMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role: "assistant",
      content: "Welcome to the demo! I've generated a sample profile for you. Here are career and major matches based on that profile. Feel free to explore!",
      timestamp: new Date(),
    };

    setSession((prev) => ({
      ...prev,
      messages: [welcomeMessage],
      conversationHistory: [
        { role: "assistant", content: welcomeMessage.content },
      ],
    }));
  }, []);

  const setSelectedVoice = useCallback((voiceId: string) => {
    setSession((prev) => ({ ...prev, selectedVoiceId: voiceId }));
  }, []);

  const toggleRecording = useCallback(
    (shouldRecord: boolean) => {
      if (session.isAISpeaking || session.isProcessing) return;

      if (shouldRecord) {
        transcriptRef.current = "";
        setInterimTranscript("");
        setFinalTranscript("");

        const started = speechRecognitionService.start(
          (transcript, isFinal) => {
            if (isFinal) {
              transcriptRef.current += transcript + " ";
              setFinalTranscript(transcriptRef.current.trim());
              // Keep showing accumulated text even after finalization
              setInterimTranscript(transcriptRef.current.trim());
            } else {
              // Show accumulated text + current interim text
              const fullDisplay = transcriptRef.current + transcript;
              setInterimTranscript(fullDisplay);
            }
          },
          (error) => {
            setError(`Microphone error: ${error}`);
            setAudioState((prev) => ({ ...prev, isRecording: false }));
            setTimeout(() => setError(null), 3000);
          }
        );

        if (started) {
          setAudioState((prev) => ({ ...prev, isRecording: true }));
        }
      } else {
        speechRecognitionService.stop();
        setAudioState((prev) => ({ ...prev, isRecording: false }));

        const fullTranscript = transcriptRef.current.trim();
        if (fullTranscript) {
          handleUserMessage(fullTranscript);
        }

        setInterimTranscript("");
        setFinalTranscript("");
        transcriptRef.current = "";
      }
    },
    [session.isAISpeaking, session.isProcessing, handleUserMessage]
  );

  const toggleCareerExpansion = useCallback(
    async (socCode: string, careerTitle: string, careerDescription: string) => {
      if (session.isProcessing) return;

      if (session.expandedCareerCode === socCode) {
        setSession((prev) => ({
          ...prev,
          expandedCareerCode: null,
        }));
        return;
      }

      setSession((prev) => ({
        ...prev,
        expandedCareerCode: socCode,
        isProcessing: true,
      }));

      if (session.careerSpecificMajors[socCode]) {
        setSession((prev) => ({
          ...prev,
          isProcessing: false,
        }));
        return;
      }

      try {
        const majors = await getMajorsForCareer(
          socCode,
          careerTitle,
          careerDescription,
          session.userProfile
        );

        setSession((prev) => ({
          ...prev,
          careerSpecificMajors: {
            ...prev.careerSpecificMajors,
            [socCode]: majors,
          },
          isProcessing: false,
        }));
      } catch (error) {
        console.error('Error fetching career-specific majors:', error);
        setSession((prev) => ({
          ...prev,
          isProcessing: false,
          expandedCareerCode: null,
        }));
        setError('Failed to load majors for this career. Please try again.');
        setTimeout(() => setError(null), 3000);
      }
    },
    [session.expandedCareerCode, session.careerSpecificMajors, session.userProfile, session.isProcessing]
  );

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
    currentSpeakingMessageId,
    startSession,
    skipToDemo,
    handleUserMessage,
    selectMajor,
    goToSummary,
    restartSession,
    toggleRecording,
    setSelectedVoice,
    isVoiceEnabled,
    setIsVoiceEnabled,
    toggleCareerExpansion,
  };
}
