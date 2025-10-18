import { useMemo } from "react";

export interface VoiceOption {
  id: string;
  name: string;
  label: string; // Friendly display including accent/character
  description?: string;
}

interface VoicePickerProps {
  value?: string | null;
  onChange: (voiceId: string) => void;
}

// Curated ElevenLabs public voices (IDs are public demo voices)
// References: ElevenLabs default voices like "Rachel", "Bella", "Antoni", "Adam", "Elli" etc.
const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "abRFZIdN4pvo8ZPmGxHP",
    name: "Arnold",
    label: "Arnold — Aussie (M)",
  },
  {
    id: "aOcS60CY8CoaVaZfqqb5",
    name: "Cowboy",
    label: "Old West Cowboy",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    label: "Josh — Conversational (M)",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Matilda",
    label: "Matilda — British (F)",
  },
];

export function VoicePicker({ value, onChange }: VoicePickerProps) {
  const options = useMemo(() => VOICE_OPTIONS, []);

  return (
    <div className="text-left">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select a voice
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={[
                "w-full text-left p-4 rounded-xl border transition-all",
                "hover:shadow-md",
                selected
                  ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300",
              ].join(" ")}
            >
              <div className="font-semibold text-gray-900">{opt.label}</div>
              {opt.description && (
                <div className="text-sm text-gray-500 mt-1">
                  {opt.description}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default VoicePicker;
