import type { Message } from "../types";
import { User, Sparkles } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-gradient-to-br from-gray-600 to-gray-700"
            : "bg-gradient-to-br from-blue-500 to-blue-600"
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Sparkles className="w-5 h-5 text-white" />
        )}
      </div>

      <div
        className={`flex-1 max-w-2xl ${isUser ? "text-right" : "text-left"}`}
      >
        <div
          className={`inline-block px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-gray-100 text-gray-900"
              : "bg-white text-gray-900 shadow-sm border border-gray-100"
          }`}
        >
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <div
          className={`mt-1 flex items-center gap-2 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          <div className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {/* Skip button removed for voice toggle UX */}
        </div>
      </div>
    </div>
  );
}
