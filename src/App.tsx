import { usePathfinderSession } from './hooks/usePathfinderSession';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ProgressBar } from './components/ProgressBar';
import { ChatInterface } from './components/ChatInterface';
import { InputControls } from './components/InputControls';
import { MajorCard } from './components/MajorCard';
import { CareerCard } from './components/CareerCard';
import { SummaryView } from './components/SummaryView';
import { AlertCircle } from 'lucide-react';

function App() {
  const {
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
  } = usePathfinderSession();

  if (session.phase === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
        <WelcomeScreen onStart={startSession} />
      </div>
    );
  }

  if (session.phase === 'summary') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
        <ProgressBar phase={session.phase} currentQuestionIndex={session.currentQuestionIndex} />
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
      <ProgressBar phase={session.phase} currentQuestionIndex={session.currentQuestionIndex} />

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

      <ChatInterface messages={session.messages} isProcessing={session.isProcessing} />

      {session.phase === 'major_suggestions' && session.suggestedMajors.length > 0 && (
        <div className="px-6 pb-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Top Major Matches</h2>
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
      )}

      {session.phase === 'career_suggestions' && session.suggestedCareers.length > 0 && !session.isProcessing && (
        <div className="px-6 pb-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Career Paths for You</h2>
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
      />
    </div>
  );
}

export default App;
