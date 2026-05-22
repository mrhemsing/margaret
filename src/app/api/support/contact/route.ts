import { NextResponse } from "next/server";
import { z } from "zod";

const supportContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  topic: z.enum(["before_signing_up", "existing_account", "billing", "call_issue", "privacy_safety", "other"]),
  message: z.string().trim().min(10).max(3000),
});

const topicLabels: Record<z.infer<typeof supportContactSchema>["topic"], string> = {
  before_signing_up: "Before signing up",
  existing_account: "Existing account",
  billing: "Billing",
  call_issue: "Call issue",
  privacy_safety: "Privacy or safety",
  other: "Other",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = supportContactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please fill out the required fields." }, { status: 400 });
  }

  const input = parsed.data;
  const submittedAt = new Date().toISOString();
  const topicLabel = topicLabels[input.topic];
  const resendApiKey = process.env.RESEND_API_KEY;
  const supportToEmail = process.env.SUPPORT_TO_EMAIL ?? "support@dailycall.care";
  const supportFromEmail = process.env.SUPPORT_FROM_EMAIL ?? "DailyCall <support@dailycall.care>";
  const supportWebhookUrl = process.env.SUPPORT_CONTACT_WEBHOOK_URL;

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: supportFromEmail,
          to: [supportToEmail],
          reply_to: input.email,
          subject: `DailyCall support: ${topicLabel}`,
          html: `
            <h2>New DailyCall support message</h2>
            <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
            <p><strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>
            <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
            ${input.phone ? `<p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>` : ""}
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(input.message).replaceAll("\n", "<br />")}</p>
          `,
          text: [
            "New DailyCall support message",
            "",
            `Submitted: ${submittedAt}`,
            `Topic: ${topicLabel}`,
            `Name: ${input.name}`,
            `Email: ${input.email}`,
            input.phone ? `Phone: ${input.phone}` : null,
            "",
            "Message:",
            input.message,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });

      if (!response.ok) {
        console.error("Support contact email failed", { status: response.status, submittedAt, topic: input.topic });
      }
    } catch (error) {
      console.error("Support contact email error", error);
    }
  } else if (supportWebhookUrl) {
    try {
      const response = await fetch(supportWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "dailycall-support-form",
          submittedAt,
          topicLabel,
          ...input,
        }),
      });

      if (!response.ok) {
        console.error("Support contact webhook failed", { status: response.status, submittedAt, topic: input.topic });
      }
    } catch (error) {
      console.error("Support contact webhook error", error);
    }
  } else {
    console.info("Support contact form submission", {
      submittedAt,
      name: input.name,
      email: input.email,
      phone: input.phone,
      topic: topicLabel,
      message: input.message,
    });
  }

  return NextResponse.json({ ok: true });
}
