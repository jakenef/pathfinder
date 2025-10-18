import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { ChatMessage } from "./ChatMessage";
import { Loader2 } from "lucide-react";

interface ChatInterfaceProps {
  messages: Message[];
  isProcessing: boolean;
  currentSpeakingMessageId?: string | null;
}

export function ChatInterface({
  messages,
  isProcessing,
  currentSpeakingMessageId,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-8 space-y-6"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isAudioPlaying={currentSpeakingMessageId === message.id}
            // Skip button removed
          />
        ))}

        {isProcessing && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="inline-block px-4 py-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
