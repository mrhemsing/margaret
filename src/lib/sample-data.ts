import type { CallAttempt, Member } from "./domain";

export const sampleMembers: Member[] = [
  {
    id: "member_001",
    name: "Eleanor Harris",
    phoneNumber: "+15550101001",
    timezone: "America/Los_Angeles",
    preferredCallTime: "9:00 AM",
    isActive: true,
    caregiverIds: ["caregiver_001"],
  },
  {
    id: "member_002",
    name: "Robert Chen",
    phoneNumber: "+15550101002",
    timezone: "America/Los_Angeles",
    preferredCallTime: "10:30 AM",
    isActive: true,
    caregiverIds: ["caregiver_002"],
  },
];

export const sampleCallAttempts: CallAttempt[] = [
  {
    id: "attempt_001",
    memberId: "member_001",
    memberName: "Eleanor Harris",
    scheduledFor: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    status: "completed_ok",
    summary: "Eleanor answered, sounded upbeat, and said she does not need help today.",
    alertSent: false,
  },
  {
    id: "attempt_002",
    memberId: "member_002",
    memberName: "Robert Chen",
    scheduledFor: new Date().toISOString(),
    status: "no_answer",
    summary: "Robert did not answer the first scheduled call. Retry is pending.",
    alertSent: false,
  },
  {
    id: "attempt_003",
    memberId: "member_001",
    memberName: "Eleanor Harris",
    scheduledFor: new Date(Date.now() - 86_400_000).toISOString(),
    startedAt: new Date(Date.now() - 86_390_000).toISOString(),
    endedAt: new Date(Date.now() - 86_340_000).toISOString(),
    status: "help_requested",
    summary: "Eleanor asked for her daughter to call about a medication question. Caregiver alert was sent.",
    alertSent: true,
  },
];
