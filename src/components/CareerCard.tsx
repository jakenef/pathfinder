import type { Career } from '../types';
import { Briefcase, TrendingUp, DollarSign, Target } from 'lucide-react';

interface CareerCardProps {
  career: Career;
}

export function CareerCard({ career }: CareerCardProps) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{career.name}</h3>
            <p className="text-gray-700 leading-relaxed">
              {career.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-start gap-2">
            <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Salary Range</p>
              <p className="text-sm font-semibold text-gray-900">{career.salary_range}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Job Outlook</p>
              <p className="text-sm font-semibold text-gray-900">{career.job_outlook}</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Target className="w-4 h-4" />
            Required Skills:
          </h4>
          <div className="flex flex-wrap gap-2">
            {career.required_skills.slice(0, 5).map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Work Environment:</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {career.work_environment}
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Next Steps:</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {career.next_steps}
          </p>
        </div>
      </div>
    </div>
  );
}
