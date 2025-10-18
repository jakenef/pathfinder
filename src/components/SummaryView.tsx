import type { Major, Career, UserProfile } from '../types';
import { CheckCircle, Sparkles, TrendingUp, BookOpen } from 'lucide-react';

interface SummaryViewProps {
  userProfile: UserProfile;
  selectedMajor: Major | null;
  suggestedCareers: Career[];
  onRestart: () => void;
}

export function SummaryView({ userProfile, selectedMajor, suggestedCareers, onRestart }: SummaryViewProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 mb-4 shadow-lg">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Your Personalized Roadmap
          </h1>
          <p className="text-lg text-gray-600">
            Here's what we discovered about your path forward
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">About You</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Your Interests:</h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.interests.slice(0, 6).map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Your Strengths:</h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.strengths.slice(0, 6).map((strength, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {selectedMajor && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg border-2 border-blue-300 p-8">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Your Selected Major</h2>
              </div>
              <h3 className="text-3xl font-bold text-blue-900 mb-3">{selectedMajor.name}</h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                {selectedMajor.description}
              </p>
              {selectedMajor.matchReason && (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-gray-800 leading-relaxed">
                    <span className="font-semibold text-blue-900">Why this fits:</span> {selectedMajor.matchReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {suggestedCareers.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Career Paths to Explore</h2>
              </div>
              <div className="space-y-4">
                {suggestedCareers.map((career, index) => (
                  <div
                    key={career.id}
                    className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {index + 1}. {career.name}
                    </h3>
                    <p className="text-gray-700 mb-3">{career.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium">{career.salary_range}</span>
                      <span>•</span>
                      <span>{career.job_outlook}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg border border-purple-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What's Next?</h2>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Connect with professors:</strong> Reach out to faculty in {selectedMajor?.name} to learn more about the program
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Explore introductory courses:</strong> Take a class to get hands-on experience
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Join student organizations:</strong> Connect with peers who share your interests
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  <strong>Seek internships:</strong> Get real-world experience in your field of interest
                </span>
              </li>
            </ul>
          </div>

          <div className="text-center pt-8">
            <button
              onClick={onRestart}
              className="px-8 py-4 bg-gray-800 text-white text-lg font-semibold rounded-xl hover:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              Start a New Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
