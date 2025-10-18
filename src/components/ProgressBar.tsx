import type { ConversationPhase } from '../types';
import { PROGRESS_PHASES, INTAKE_QUESTIONS } from '../types';

interface ProgressBarProps {
  phase: ConversationPhase;
  currentQuestionIndex: number;
}

export function ProgressBar({ phase, currentQuestionIndex }: ProgressBarProps) {
  const calculateProgress = (): number => {
    const currentPhaseData = PROGRESS_PHASES.find(p => p.phase === phase);
    if (!currentPhaseData) return 0;

    const previousWeight = PROGRESS_PHASES
      .filter(p => PROGRESS_PHASES.indexOf(p) < PROGRESS_PHASES.indexOf(currentPhaseData))
      .reduce((sum, p) => sum + p.weight, 0);

    if (phase === 'intake') {
      const questionProgress = (currentQuestionIndex / INTAKE_QUESTIONS.length) * currentPhaseData.weight;
      return previousWeight + questionProgress;
    }

    return previousWeight + currentPhaseData.weight;
  };

  const progress = calculateProgress();
  const currentPhaseData = PROGRESS_PHASES.find(p => p.phase === phase);

  return (
    <div className="w-full bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {currentPhaseData?.label || 'Getting Started'}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          {PROGRESS_PHASES.filter(p => p.phase !== 'welcome').map((phaseData, index) => {
            const isActive = phaseData.phase === phase;
            const phaseIndex = PROGRESS_PHASES.indexOf(phaseData);
            const currentIndex = PROGRESS_PHASES.findIndex(p => p.phase === phase);
            const isCompleted = phaseIndex < currentIndex;

            return (
              <div
                key={phaseData.phase}
                className="flex items-center"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors duration-300 ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : isCompleted
                      ? 'bg-blue-200 text-blue-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                {index < PROGRESS_PHASES.filter(p => p.phase !== 'welcome').length - 1 && (
                  <div className="w-12 h-0.5 bg-gray-200 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
