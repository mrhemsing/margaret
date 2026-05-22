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
  return (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://soma3.b-average.com").replace(/\/$/, "");
}
