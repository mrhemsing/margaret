import OpenAI from "openai";

import { containsBlockedTerms } from "@/lib/content-safety";

export type OpenThread = {
  text: string;
  topic: string;
  eventDate?: string;
  sensitive?: boolean;
};

function clean(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeThread(thread: OpenThread): OpenThread | null {
  const text = clean(thread.text);
  const topic = clean(thread.topic).toLowerCase();

  if (!text || text.length > 160 || !topic || containsBlockedTerms(text)) return null;

  return {
    text,
    topic: topic.slice(0, 40),
    eventDate: thread.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(thread.eventDate) ? thread.eventDate : undefined,
    sensitive: Boolean(thread.sensitive),
  };
}

function parseThreads(value: string): OpenThread[] {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { threads?: unknown }).threads)) return [];

  return (parsed as { threads: unknown[] }).threads
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.text !== "string" || typeof record.topic !== "string") return null;

      return sanitizeThread({
        text: record.text,
        topic: record.topic,
        eventDate: typeof record.eventDate === "string" ? record.eventDate : undefined,
        sensitive: record.sensitive === true,
      });
    })
    .filter((thread): thread is OpenThread => Boolean(thread))
    .slice(0, 3);
}

export async function extractOpenThreads(input: {
  transcript: string;
  memberName: string;
  priorThreads?: string[];
}): Promise<OpenThread[]> {
  if (!process.env.OPENAI_API_KEY || !input.transcript.trim()) return [];

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            "Extract callback-ready memory threads from a senior companion call transcript.",
            "Return 1 to 3 concrete threads max, only when the senior actually mentioned a specific person, event, plan, hobby, or concern.",
            "Write text in second person, ready to say after 'Last time,'. Example: 'you were waiting to hear how Sam's tournament went'.",
            "Include concrete names, nouns, or dates when present. Do not invent facts.",
            "Mark health, loss, grief, or medical-adjacent items sensitive. Do not diagnose or make clinical claims.",
            "No audio tags, emotion tags, markdown, or stage directions.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            memberName: input.memberName,
            priorThreads: input.priorThreads ?? [],
            transcript: input.transcript.slice(0, 12000),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dailycall_open_threads",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              threads: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    topic: { type: "string" },
                    eventDate: { type: ["string", "null"] },
                    sensitive: { type: "boolean" },
                  },
                  required: ["text", "topic", "eventDate", "sensitive"],
                },
              },
            },
            required: ["threads"],
          },
        },
      },
    });

    return parseThreads(response.output_text);
  } catch (error) {
    console.error("Open thread extraction failed", error);
    return [];
  }
}
