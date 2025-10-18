import { useState, useCallback, useRef, useEffect } from "react";
import type { SessionState, Message, Major, AudioState } from "../types";
import { INTAKE_QUESTIONS } from "../types";
import { speechRecognitionService } from "../services/speechService";
import { textToSpeech, audioPlayer } from "../services/elevenLabsService";
import { cleanTextForTTS } from "../lib/textCleaner";
import { supabase } from "../lib/supabase";
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
    riasecScores: {
      realistic: 0,
      investigative: 0,
      artistic: 0,
      social: 0,
      enterprising: 0,
      conventional: 0,
    },
    bigFiveTraits: {
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      emotionalStability: 0,
    },
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
          const matchedCareers = await findMatchingCareers(riasecScore);

          setSession((prev) => ({
            ...prev,
            phase: "major_suggestions",
            userProfile: profileWithRIASEC,
            matchedSOCCareers: matchedCareers,
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

      const careers = await getCareersForMajor(
        major.id,
        major.name,
        major.description
      );
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
    try {
      console.log("=== SKIP TO DEMO STARTED ===");

      // Show loading state
      setSession((prev) => ({ ...prev, isProcessing: true }));

      // Generate random RIASEC scores (0-5 range with at least 2 strong types)
      const generateRandomRIASEC = () => {
        const scores = {
          realistic: Math.floor(Math.random() * 6),
          investigative: Math.floor(Math.random() * 6),
          artistic: Math.floor(Math.random() * 6),
          social: Math.floor(Math.random() * 6),
          enterprising: Math.floor(Math.random() * 6),
          conventional: Math.floor(Math.random() * 6),
        };

        // Ensure at least 2 types have scores >= 3
        const types = Object.keys(scores) as Array<keyof typeof scores>;
        const highScoreTypes = types.filter(t => scores[t] >= 3);
        if (highScoreTypes.length < 2) {
          const randomTypes = types.sort(() => Math.random() - 0.5).slice(0, 2);
          randomTypes.forEach(t => {
            scores[t] = 3 + Math.floor(Math.random() * 3);
          });
        }

        return scores;
      };

      // Generate random Big Five traits (-3 to +3 range)
      const generateRandomBigFive = () => ({
        openness: Math.floor(Math.random() * 7) - 3,
        conscientiousness: Math.floor(Math.random() * 7) - 3,
        extraversion: Math.floor(Math.random() * 7) - 3,
        agreeableness: Math.floor(Math.random() * 7) - 3,
        emotionalStability: Math.floor(Math.random() * 7) - 3,
      });

      const demoRIASECScores = generateRandomRIASEC();
      const demoBigFive = generateRandomBigFive();

      // Get top RIASEC types for description
      const topTypes = Object.entries(demoRIASECScores)
        .filter(([_, score]) => score >= 3)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type);

      console.log("=== DEMO PERSONALITY PROFILE ===");
      console.log("RIASEC Scores:", demoRIASECScores);
      console.log("Top RIASEC Types:", topTypes);
      console.log("Big Five Traits:", demoBigFive);
      console.log("================================");

      // Create a demo profile with random personality scores
      const demoProfile = {
        interests: ["technology", "problem-solving", "creativity", "helping others"],
        strengths: ["analytical thinking", "communication", "organization"],
        values: ["innovation", "impact", "growth"],
        workStyle: ["collaborative", "flexible", "detail-oriented"],
        responses: {
          q1_interests: "I enjoy a mix of creative and analytical work",
          q2_strengths: "I'm good at problem-solving and working with people",
          q3_work_style: "I prefer collaborative environments with some structure",
          q4_learning: "I like hands-on learning combined with theory",
          q5_decisions: "I consider both logic and impact on people",
          q6_environment: "Dynamic, people-focused environments",
          q7_values: "Making a positive impact and continuous learning",
          q8_challenges: "Complex problems that help others"
        },
        riasecScores: demoRIASECScores,
        bigFiveTraits: demoBigFive,
      };

      console.log("Fetching majors from database...");

      // Fetch all majors and score them
      const allMajors = await getMajors();
      console.log("All majors fetched:", allMajors.length);

      // Score majors based on demo profile
      const scoredMajors = scoreMajors(allMajors, demoProfile);
      console.log("Scored majors:", scoredMajors.length);
      console.log("Top 3 majors:", scoredMajors.slice(0, 3).map(m => ({ name: m.name, score: m.matchScore })));

      // Create personality description
      const riasecDescriptions: { [key: string]: string } = {
        realistic: 'hands-on and practical',
        investigative: 'analytical and research-oriented',
        artistic: 'creative and expressive',
        social: 'people-focused and collaborative',
        enterprising: 'leadership-driven and persuasive',
        conventional: 'organized and detail-oriented'
      };

      const topRiasecDesc = topTypes.map(t => riasecDescriptions[t]).join(', ');

      const bigFiveDesc = [];
      if (demoBigFive.openness > 1) bigFiveDesc.push('curious and open to new ideas');
      if (demoBigFive.conscientiousness > 1) bigFiveDesc.push('organized and disciplined');
      if (demoBigFive.extraversion > 1) bigFiveDesc.push('energized by people');
      if (demoBigFive.agreeableness > 1) bigFiveDesc.push('empathetic and collaborative');
      if (demoBigFive.emotionalStability > 1) bigFiveDesc.push('calm under pressure');

      // Add a welcome message with personality info
      const welcomeMessage: Message = {
        id: `${Date.now()}-${Math.random()}`,
        role: "assistant",
        content: `Welcome to the demo! I've created a sample personality profile for you.\n\n🎯 Your Demo Personality:\n- Work Style: ${topRiasecDesc}\n${bigFiveDesc.length > 0 ? `- Traits: ${bigFiveDesc.join(', ')}\n` : ''}\nBelow are your top major matches based on this profile. Each card shows why it's a good fit for your personality type!`,
        timestamp: new Date(),
      };

      console.log("Setting session state with:", {
        phase: "major_suggestions",
        suggestedMajors: scoredMajors.length,
      });

      // Update session with all data at once
      setSession((prev) => ({
        ...prev,
        phase: "major_suggestions",
        userProfile: demoProfile,
        suggestedMajors: scoredMajors,
        messages: [welcomeMessage],
        conversationHistory: [
          { role: "assistant", content: welcomeMessage.content },
        ],
        isProcessing: false,
      }));

      console.log("=== SKIP TO DEMO COMPLETE ===");
    } catch (error) {
      console.error("Error in skipToDemo:", error);
      setError("Failed to load demo. Please try again.");
      setSession((prev) => ({ ...prev, isProcessing: false }));
      setTimeout(() => setError(null), 3000);
    }
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
        console.error("Error fetching career-specific majors:", error);
        setSession((prev) => ({
          ...prev,
          isProcessing: false,
          expandedCareerCode: null,
        }));
        setError("Failed to load majors for this career. Please try again.");
        setTimeout(() => setError(null), 3000);
      }
    },
    [
      session.expandedCareerCode,
      session.careerSpecificMajors,
      session.userProfile,
      session.isProcessing,
    ]
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
