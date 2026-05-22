export const defaultVoiceId = "hpp4J3VqNfWAUOO0d1Us";

export const voiceOptions = [
  {
    id: defaultVoiceId,
    name: "Female Companion",
    gender: "Female",
    description: "Soft, caring female voice for everyday check-ins.",
    imagePath: "/voices/marin-companion-tied-back-35.webp",
    openAIRealtimeVoice: "marin",
  },
  {
    id: "cjVigY5qzO86Huf0OWal",
    name: "Male Companion",
    gender: "Male",
    description: "Gentle, understanding male voice for relaxed calls.",
    imagePath: "/voices/cedar-companion-35.webp",
    openAIRealtimeVoice: "cedar",
  },
] as const;

export type VoiceOption = (typeof voiceOptions)[number];

export function getVoiceOption(voiceId?: string | null) {
  return voiceOptions.find((voice) => voice.id === voiceId) ?? voiceOptions[0];
}

export function isAllowedVoiceId(voiceId: string) {
  return voiceOptions.some((voice) => voice.id === voiceId);
}

export function getOpenAIRealtimeVoice(voiceId?: string | null) {
  return getVoiceOption(voiceId).openAIRealtimeVoice;
}
