import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

export const cartesiaTestCallSchema = z.object({
  transcript: z.string().trim().min(1).max(1000),
  modelId: z.enum(["sonic-3.5", "sonic-2", "sonic-3"]).default("sonic-3.5"),
  voiceId: z.string().uuid(),
  toNumber: z.string().trim().min(8).max(32),
  memberName: z.string().trim().min(1).max(80).default("Matt"),
});

export type CartesiaTestCallPayload = z.infer<typeof cartesiaTestCallSchema> & {
  exp: number;
};

export type CartesiaVoiceConfig = {
  modelId: z.infer<typeof cartesiaTestCallSchema>["modelId"];
  voiceId: string;
};

export function getCartesiaConfigFromRaw(raw: unknown): CartesiaVoiceConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const config = (raw as Record<string, unknown>).cartesiaConfig;
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;

  const parsed = cartesiaTestCallSchema
    .pick({ modelId: true, voiceId: true })
    .safeParse(config);

  return parsed.success ? parsed.data : null;
}

export async function synthesizeCartesiaPhoneSpeech(input: CartesiaVoiceConfig & { transcript: string }) {
  const { getServerEnv } = await import("@/lib/env");
  const env = getServerEnv();

  if (!env.CARTESIA_API_KEY) {
    throw new Error("CARTESIA_API_KEY is not configured.");
  }

  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CARTESIA_API_KEY}`,
      "Cartesia-Version": "2025-04-16",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transcript: input.transcript,
      model_id: input.modelId,
      voice: {
        mode: "id",
        id: input.voiceId,
      },
      output_format: {
        container: "wav",
        encoding: "pcm_mulaw",
        sample_rate: 8000,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Cartesia audio failed with status ${response.status}.`);
  }

  return response;
}

function getSigningSecret() {
  const secret = process.env.ADMIN_DASHBOARD_PASSWORD || process.env.TWILIO_AUTH_TOKEN || process.env.CARTESIA_API_KEY;

  if (!secret) {
    throw new Error("Cartesia test call signing is not configured.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url");
}

export function createCartesiaTestCallToken(input: z.infer<typeof cartesiaTestCallSchema>) {
  const payload: CartesiaTestCallPayload = {
    ...input,
    exp: Date.now() + 10 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyCartesiaTestCallToken(token: string | null) {
  if (!token) {
    throw new Error("Missing Cartesia test call token.");
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Invalid Cartesia test call token.");
  }

  const expected = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error("Invalid Cartesia test call signature.");
  }

  const parsed = cartesiaTestCallSchema
    .extend({ exp: z.number() })
    .safeParse(JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")));

  if (!parsed.success) {
    throw new Error("Invalid Cartesia test call payload.");
  }

  if (parsed.data.exp < Date.now()) {
    throw new Error("Cartesia test call token expired.");
  }

  return parsed.data;
}

export function getPublicBaseUrl() {
  return (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://dailycall.care").replace(/\/$/, "");
}
