import { z } from "zod";

const optionalString = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());
const optionalVoiceProvider = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["openai_realtime_twilio", "openai_text_elevenlabs_twilio", "elevenlabs_twilio"]).optional(),
);
const optionalReasoningEffort = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["minimal", "low", "medium", "high"]).optional(),
);
const optionalVadEagerness = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["low", "medium", "high", "auto"]).optional(),
);

const serverEnvSchema = z.object({
  APP_URL: optionalUrl,
  PUBLIC_APP_URL: optionalUrl,
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  VOICE_PROVIDER: optionalVoiceProvider,
  OPENAI_API_KEY: optionalString,
  OPENAI_PROJECT_ID: optionalString,
  OPENAI_WEBHOOK_SECRET: optionalString,
  OPENAI_REALTIME_MODEL: optionalString,
  OPENAI_TEXT_MODEL: optionalString,
  OPENAI_REALTIME_VOICE: optionalString,
  OPENAI_REALTIME_REASONING_EFFORT: optionalReasoningEffort,
  OPENAI_REALTIME_VAD_EAGERNESS: optionalVadEagerness,
  ELEVENLABS_API_KEY: optionalString,
  ELEVENLABS_AGENT_ID: optionalString,
  ELEVENLABS_AGENT_PHONE_NUMBER_ID: optionalString,
  CARTESIA_API_KEY: optionalString,
  CARTESIA_AGENT_ID: optionalString,
  CARTESIA_FROM_NUMBER_ID: optionalString,
  DEEPGRAM_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_FROM_NUMBER: optionalString,
  TWILIO_MESSAGING_SERVICE_SID: optionalString,
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    APP_URL: process.env.APP_URL,
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VOICE_PROVIDER: process.env.VOICE_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID,
    OPENAI_WEBHOOK_SECRET: process.env.OPENAI_WEBHOOK_SECRET,
    OPENAI_REALTIME_MODEL: process.env.OPENAI_REALTIME_MODEL,
    OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
    OPENAI_REALTIME_VOICE: process.env.OPENAI_REALTIME_VOICE,
    OPENAI_REALTIME_REASONING_EFFORT: process.env.OPENAI_REALTIME_REASONING_EFFORT,
    OPENAI_REALTIME_VAD_EAGERNESS: process.env.OPENAI_REALTIME_VAD_EAGERNESS,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID,
    ELEVENLABS_AGENT_PHONE_NUMBER_ID: process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID,
    CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
    CARTESIA_AGENT_ID: process.env.CARTESIA_AGENT_ID,
    CARTESIA_FROM_NUMBER_ID: process.env.CARTESIA_FROM_NUMBER_ID,
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
  });
}
