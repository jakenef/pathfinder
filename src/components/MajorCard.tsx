import type { Major } from '../types';
import { GraduationCap, Sparkles } from 'lucide-react';

interface MajorCardProps {
  major: Major;
  onSelect: (major: Major) => void;
  isSelected?: boolean;
}

export function MajorCard({ major, onSelect, isSelected = false }: MajorCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
        isSelected
          ? 'border-blue-500 shadow-md'
          : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{major.name}</h3>
            {major.matchScore && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">
                  {major.matchScore > 10 ? 'Great' : major.matchScore > 5 ? 'Good' : 'Potential'} match
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="text-gray-700 mb-4 leading-relaxed">
          {major.description}
        </p>

        {major.matchReason && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900 leading-relaxed">
              <span className="font-semibold">Why this fits you:</span> {major.matchReason}
            </p>
          </div>
        )}

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Skills:</h4>
          <div className="flex flex-wrap gap-2">
            {major.key_skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => onSelect(major)}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md'
          }`}
        >
          {isSelected ? 'Selected' : 'Explore This Major'}
        </button>
      </div>
    </div>
  );
}
