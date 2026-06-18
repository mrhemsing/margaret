export const defaultVoiceId = "hpp4J3VqNfWAUOO0d1Us";
export const productionElevenLabsTtsModel = "eleven_flash_v2";
export const evaluationElevenLabsTtsModel = "eleven_v3_conversational";
export const defaultElevenLabsTtsSpeed = 0.95;
export const defaultClearSpeed = 0.75;
export const minMemberSpeechSpeed = 0.7;
export const maxMemberSpeechSpeed = 1.05;

export type VoiceMode = "expressive" | "clear";

export const voiceModeOptions = [
  {
    value: "expressive",
    label: "Warm & expressive",
    description: "Recommended for most people. Uses the expressive V3 conversation agent.",
  },
  {
    value: "clear",
    label: "Clear & slower",
    description: "Best if hearing is difficult. Uses the clearer Flash v2 agent at a slower pace.",
  },
] as const satisfies Array<{ value: VoiceMode; label: string; description: string }>;

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

export function normalizeSpeechSpeed(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(maxMemberSpeechSpeed, Math.max(minMemberSpeechSpeed, Number(value.toFixed(2))));
}

export function normalizeVoiceMode(value?: string | null): VoiceMode {
  return value === "clear" ? "clear" : "expressive";
}

export function resolveAgentConfig(
  voiceMode: VoiceMode,
  speechSpeed: number | null | undefined,
  env: { ELEVENLABS_AGENT_ID?: string; ELEVENLABS_AGENT_ID_CLEAR?: string },
) {
  if (voiceMode === "clear") {
    return {
      agentId: env.ELEVENLABS_AGENT_ID_CLEAR ?? env.ELEVENLABS_AGENT_ID,
      ttsSpeed: normalizeSpeechSpeed(speechSpeed) ?? defaultClearSpeed,
      clearAgentMissing: !env.ELEVENLABS_AGENT_ID_CLEAR,
    };
  }

  return {
    agentId: env.ELEVENLABS_AGENT_ID,
    ttsSpeed: null,
    clearAgentMissing: false,
  };
}
