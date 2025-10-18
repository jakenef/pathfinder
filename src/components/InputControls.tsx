import { useState } from 'react';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';

interface InputControlsProps {
  onSendMessage: (message: string) => void;
  onMicToggle: (isRecording: boolean) => void;
  isRecording: boolean;
  isAISpeaking: boolean;
  isProcessing: boolean;
  interimTranscript: string;
  isMicAvailable: boolean;
}

export function InputControls({
  onSendMessage,
  onMicToggle,
  isRecording,
  isAISpeaking,
  isProcessing,
  interimTranscript,
  isMicAvailable
}: InputControlsProps) {
  const [textInput, setTextInput] = useState('');

  const handleSendText = () => {
    if (textInput.trim() && !isProcessing && !isAISpeaking) {
      onSendMessage(textInput.trim());
      setTextInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleMicClick = () => {
    if (!isAISpeaking && !isProcessing) {
      onMicToggle(!isRecording);
    }
  };

  const isDisabled = isAISpeaking || isProcessing;

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-4">
      <div className="max-w-4xl mx-auto">
        {isAISpeaking && (
          <div className="mb-3 flex items-center justify-center gap-2 text-blue-600 text-sm font-medium">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>Pathfinder is speaking...</span>
          </div>
        )}

        {isRecording && interimTranscript && (
          <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Listening...</p>
            <p className="text-base text-gray-900">{interimTranscript}</p>
          </div>
        )}

        <div className="flex items-end gap-3">
          {isMicAvailable && (
            <button
              onClick={handleMicClick}
              disabled={isDisabled}
              className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg scale-110'
                  : isDisabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 shadow-md hover:scale-105'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>
          )}

          <div className="flex-1 flex items-end gap-2">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isAISpeaking
                  ? 'Wait for Pathfinder to finish speaking...'
                  : isProcessing
                  ? 'Processing...'
                  : isMicAvailable
                  ? 'Type your message or use the mic...'
                  : 'Type your message...'
              }
              disabled={isDisabled}
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={{ minHeight: '56px', maxHeight: '120px' }}
            />

            <button
              onClick={handleSendText}
              disabled={!textInput.trim() || isDisabled}
              className="flex-shrink-0 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-md"
              title="Send message"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500 text-center">
          {isMicAvailable
            ? 'Click the mic to speak, or type your response. Press Enter to send.'
            : 'Microphone not available. Type your response and press Enter to send.'}
        </p>
      </div>
    </div>
  );
}
