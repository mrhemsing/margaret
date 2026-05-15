import type { PrismaClient } from "@prisma/client";

function timeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour") === 24 ? 0 : value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function zonedDateTimeToUtc(parts: { year: number; month: number; day: number; hour: number; minute: number }, timeZone: string) {
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0));
  const rendered = timeZoneParts(utcGuess, timeZone);
  const intendedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  const renderedUtc = Date.UTC(rendered.year, rendered.month - 1, rendered.day, rendered.hour, rendered.minute, rendered.second);

  return new Date(utcGuess.getTime() + intendedUtc - renderedUtc);
}

function addDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function parsePreferredCallTimes(preferredCallTime: string) {
  return preferredCallTime
    .split(",")
    .map((time) => time.trim())
    .filter((time) => /^\d{2}:\d{2}$/.test(time));
}

export function nextScheduledCallAt(preferredCallTime: string, timeZone: string, now = new Date()) {
  const [hourText, minuteText] = preferredCallTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const today = timeZoneParts(now, timeZone);
  let scheduledFor = zonedDateTimeToUtc({ year: today.year, month: today.month, day: today.day, hour, minute }, timeZone);

  if (scheduledFor <= now) {
    const tomorrow = addDays(today, 1);
    scheduledFor = zonedDateTimeToUtc({ ...tomorrow, hour, minute }, timeZone);
  }

  return scheduledFor;
}

export async function ensureUpcomingScheduledCalls(
  prisma: PrismaClient,
  members: Array<{ id: string; active: boolean; preferredCallTime: string; timezone: string }>,
) {
  const now = new Date();

  for (const member of members) {
    if (!member.active) continue;

    const callTimes = parsePreferredCallTimes(member.preferredCallTime);

    for (const callTime of callTimes) {
      const scheduledFor = nextScheduledCallAt(callTime, member.timezone, now);
      const summary = `Scheduled daily call for ${callTime}.`;
      const existing = await prisma.callAttempt.findFirst({
        where: {
          memberId: member.id,
          status: "SCHEDULED",
          scheduledFor: { gte: now },
          summary,
        },
        select: { id: true },
      });

      if (existing) continue;

      await prisma.callAttempt.create({
        data: {
          memberId: member.id,
          scheduledFor,
          status: "SCHEDULED",
          summary,
        },
      });
    }
  }
}
