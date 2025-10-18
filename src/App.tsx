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
  } = usePathfinderSession();

  if (session.phase === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
        <WelcomeScreen
          onStart={startSession}
          onSkipToDemo={skipToDemo}
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

      {/* Debug info - remove this later */}
      {session.phase === "major_suggestions" && (
        <div className="px-6 pb-2">
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs">
              <strong>Debug Info:</strong> Phase: {session.phase}, Matched
              Careers: {session.matchedSOCCareers.length}, Suggested Majors:{" "}
              {session.suggestedMajors.length}
              {session.matchedSOCCareers.length === 0 &&
                session.suggestedMajors.length === 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    <strong>⚠️ Database appears to be empty!</strong>
                    <br />
                    Please run these commands to load data:
                    <br />
                    <code className="bg-gray-800 text-green-400 px-2 py-1 rounded mt-1 block">
                      node load-soc-data.mjs
                      <br />
                      node load-cip-majors.mjs
                    </code>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {session.phase === "major_suggestions" &&
        session.matchedSOCCareers.length > 0 && (
          <div className="px-6 pb-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Top Career Matches
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click any career to see which majors will help you get there
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {session.matchedSOCCareers.slice(0, 4).map((career) => (
                  <div key={career.soc_code} id={`career-${career.soc_code}`}>
                    <button
                      onClick={() => {
                        toggleCareerExpansion(
                          career.soc_code,
                          career.title,
                          career.description
                        );
                        setTimeout(() => {
                          const element = document.getElementById(
                            `career-${career.soc_code}`
                          );
                          if (
                            element &&
                            session.expandedCareerCode !== career.soc_code
                          ) {
                            element.scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                            });
                          }
                        }, 100);
                      }}
                      disabled={session.isProcessing}
                      className="w-full text-left bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-6 border-2 border-gray-100 hover:border-blue-300 disabled:hover:border-gray-100 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                          {career.title}
                        </h3>
                        <div className="flex flex-col gap-1 ml-2">
                          {career.matchScore && !career.isRelated && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex-shrink-0">
                              Top Match
                            </span>
                          )}
                          {career.isRelated && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex-shrink-0">
                              Related
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                        {career.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          SOC Code: {career.soc_code}
                        </span>
                        <span className="text-xs font-medium text-blue-600">
                          {session.expandedCareerCode === career.soc_code
                            ? "Click to collapse ▲"
                            : "Click to explore →"}
                        </span>
                      </div>
                    </button>

                    {session.expandedCareerCode === career.soc_code && (
                      <div className="mt-4 pl-4 border-l-4 border-blue-300">
                        {session.isProcessing &&
                        !session.careerSpecificMajors[career.soc_code] ? (
                          <div className="bg-blue-50 rounded-lg p-6 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-sm text-gray-600">
                              Finding the best majors for this career...
                            </p>
                          </div>
                        ) : session.careerSpecificMajors[career.soc_code]
                            ?.length > 0 ? (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                              Majors that lead to {career.title}
                            </h4>
                            <div className="space-y-3">
                              {session.careerSpecificMajors[
                                career.soc_code
                              ].map((major) => (
                                <MajorCard
                                  key={major.id}
                                  major={major}
                                  onSelect={selectMajor}
                                  isSelected={
                                    session.selectedMajor?.id === major.id
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                            <p className="text-sm text-gray-700">
                              We couldn't find specific major matches for this
                              career. Try exploring other careers or contact an
                              advisor for personalized guidance.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
                  disabled={session.isProcessing}
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
