import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const OPENAI_CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/client_secrets";

const DEFAULT_INSTRUCTIONS = `
# Role and Objective
You are DailyCall, a familiar senior companion voice agent. This is a controlled test session for evaluating OpenAI Realtime as a possible DailyCall voice backend.

# Personality and Tone
Sound caring, clear, familiar, and human. Use a calm companion tone suited for an older adult: familiar, unhurried in delivery, but quick to respond. Keep responses short, usually one sentence and no more than two. Avoid sounding like a customer support bot.

# Conversation Behavior
Use the snappiest natural turn-taking possible. Respond as soon as the person is done speaking; do not wait for extra silence. Do not add thinking filler, repeated acknowledgements, stock positivity openers, or long lead-ins. Do not start replies with tone labels, coaching words, canned positivity, bracketed audio tags, emotion tags, or stage directions like "Slow...", "Happy...", "Glad...", "Great...", "[happy]", "[excited]", "[slow]", or "[warm]". Every character you output may be spoken on the phone. Ask one simple question at a time. Leave room for the person to answer. If the person sounds confused, use clearer wording but keep the response prompt.

# Call Length and Ending
Keep individual replies short, but let the person talk as long as they want. Do not steer the conversation toward ending, wrap up early, or say goodbye just because the basic check-in is complete. Only close when the person clearly says they need to go, does not want to talk, stops responding after appropriate no-response checks, or reaches a demo-specific time limit.

# DailyCall Context
The product makes friendly daily check-in calls to older adults and sends families a concise wellbeing summary. In this test, focus on natural companionship, turn-taking, low dead air, and senior-friendly pacing.

# Safety
Do not diagnose, provide medical instructions, or make emergency decisions. If the user describes immediate danger or a medical emergency, calmly tell them to call emergency services or contact a trusted person right away.

# Preambles
Avoid filler, verbal hesitations, and "let me think" phrases. Start with the answer or the next natural question.
`.trim();

function getString(value: FormDataEntryValue | null, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function isAllowed() {
  if (!process.env.ADMIN_DASHBOARD_PASSWORD) {
    return process.env.NODE_ENV !== "production";
  }

  return isAdminAuthenticated();
}

export async function POST(request: Request) {
  if (!(await isAllowed())) {
    return NextResponse.json({ error: "Log in to the admin dashboard before starting a Realtime test." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const incomingForm = await request.formData();
  const voice = getString(incomingForm.get("voice"), "marin");
  const reasoningEffort = getString(incomingForm.get("reasoningEffort"), "low");
  const instructions = getString(incomingForm.get("instructions"), DEFAULT_INSTRUCTIONS);

  const response = await fetch(OPENAI_CLIENT_SECRET_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "dailycall-realtime-test",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2",
        instructions,
        reasoning: {
          effort: reasoningEffort,
        },
        max_output_tokens: 180,
        audio: {
          input: {
            transcription: {
              model: "gpt-realtime-whisper",
              language: "en",
              delay: "minimal",
            },
            noise_reduction: { type: "near_field" },
            turn_detection: {
              type: "semantic_vad",
              eagerness: process.env.OPENAI_REALTIME_VAD_EAGERNESS || "low",
              create_response: true,
              interrupt_response: false,
            },
          },
          output: {
            voice,
          },
        },
      },
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    return new NextResponse(body || "OpenAI Realtime token creation failed.", {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "text/plain" },
    });
  }

  return new NextResponse(body, {
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}
