import { usePathfinderSession } from "./hooks/usePathfinderSession";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ProgressBar } from "./components/ProgressBar";
import { ChatInterface } from "./components/ChatInterface";
import { InputControls } from "./components/InputControls";
import { MajorCard } from "./components/MajorCard";
import { CareerCard } from "./components/CareerCard";
import { SummaryView } from "./components/SummaryView";
import { AlertCircle } from "lucide-react";

function App() {
  const {
    session,
    audioState,
    interimTranscript,
    error,
    currentSpeakingMessageId,
    startSession,
    handleUserMessage,
    selectMajor,
    goToSummary,
    restartSession,
    toggleRecording,
    setSelectedVoice,
    isVoiceEnabled,
    setIsVoiceEnabled,
  } = usePathfinderSession();

  if (session.phase === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
        <WelcomeScreen
          onStart={startSession}
          onSelectVoice={setSelectedVoice}
          selectedVoiceId={session.selectedVoiceId}
        />
      </div>
    );
  }

  if (session.phase === "summary") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
        <ProgressBar
          phase={session.phase}
          currentQuestionIndex={session.currentQuestionIndex}
        />
        <SummaryView
          userProfile={session.userProfile}
          selectedMajor={session.selectedMajor}
          suggestedCareers={session.suggestedCareers}
          onRestart={restartSession}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <ProgressBar
        phase={session.phase}
        currentQuestionIndex={session.currentQuestionIndex}
      />

      {error && (
        <div className="px-6 pt-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <ChatInterface
        messages={session.messages}
        isProcessing={session.isProcessing}
        currentSpeakingMessageId={currentSpeakingMessageId}
      />

      {session.phase === "major_suggestions" &&
        session.suggestedMajors.length > 0 && (
          <div className="px-6 pb-6">
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Your Top Career Matches
                </h2>
                {session.matchedSOCCareers.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {session.matchedSOCCareers.slice(0, 4).map((career) => (
                      <div
                        key={career.soc_code}
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                            {career.title}
                          </h3>
                          {career.matchScore && !career.isRelated && (
                            <span className="ml-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex-shrink-0">
                              Top Match
                            </span>
                          )}
                          {career.isRelated && (
                            <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex-shrink-0">
                              Related
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                          {career.description}
                        </p>
                        <div className="mt-3 text-xs text-gray-500">
                          SOC Code: {career.soc_code}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Your Top Major Matches
                </h2>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {session.suggestedMajors.map((major) => (
                    <MajorCard
                      key={major.id}
                      major={major}
                      onSelect={selectMajor}
                      isSelected={session.selectedMajor?.id === major.id}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {session.phase === "career_suggestions" &&
        session.suggestedCareers.length > 0 &&
        !session.isProcessing && (
          <div className="px-6 pb-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Career Paths for You
              </h2>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {session.suggestedCareers.map((career) => (
                  <CareerCard key={career.id} career={career} />
                ))}
              </div>
              <div className="text-center mt-6">
                <button
                  onClick={goToSummary}
                  disabled={session.isProcessing || session.isAISpeaking}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white text-lg font-semibold rounded-xl hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                >
                  View Your Complete Roadmap
                </button>
              </div>
            </div>
          </div>
        )}

      <InputControls
        onSendMessage={handleUserMessage}
        onMicToggle={toggleRecording}
        isRecording={audioState.isRecording}
        isAISpeaking={session.isAISpeaking}
        isProcessing={session.isProcessing}
        interimTranscript={interimTranscript}
        isMicAvailable={audioState.isMicAvailable}
        isVoiceEnabled={isVoiceEnabled}
        setIsVoiceEnabled={setIsVoiceEnabled}
      />
    </div>
  );
}

export default App;
