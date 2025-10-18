import { Compass, Sparkles, MessageCircle, Target, FastForward } from "lucide-react";
import { VoicePicker } from "./VoicePicker";

interface WelcomeScreenProps {
  onStart: () => void;
  onSkipToDemo: () => void;
  onSelectVoice?: (voiceId: string) => void;
  selectedVoiceId?: string | null;
}

export function WelcomeScreen({
  onStart,
  onSkipToDemo,
  onSelectVoice,
  selectedVoiceId,
}: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mb-6 shadow-lg">
            <Compass className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to Pathfinder
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Your AI-powered guide to discovering the perfect major and career
            path
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            How it works:
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Natural Conversation
                </h3>
                <p className="text-gray-600">
                  I'll ask you a few questions about your interests, strengths,
                  and values. You can speak using your microphone or type your
                  responses.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Personalized Matches
                </h3>
                <p className="text-gray-600">
                  Based on what you share, I'll suggest majors that align with
                  who you are and what matters to you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Career Exploration
                </h3>
                <p className="text-gray-600">
                  Once you choose a major, I'll show you exciting career paths
                  and give you actionable next steps to get started.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Pick your guide's voice
          </h2>
          <p className="text-gray-600 mb-4">
            Choose a voice style for Pathfinder before starting your journey.
          </p>
          <VoicePicker
            value={selectedVoiceId ?? null}
            onChange={(id) => onSelectVoice?.(id)}
          />
        </div>

        <div className="text-center space-y-4">
          <button
            onClick={onStart}
            disabled={!selectedVoiceId}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-lg font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
          >
            <Sparkles className="w-5 h-5" />
            Start Your Journey
          </button>
          <p className="text-sm text-gray-500">
            This will take about 5-10 minutes
          </p>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={onSkipToDemo}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-semibold rounded-lg hover:from-gray-700 hover:to-gray-800 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              <FastForward className="w-4 h-4" />
              Quick Demo (Skip to Results)
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Skip questions and see results with sample data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
