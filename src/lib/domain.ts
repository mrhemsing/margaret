export type CallAttemptStatus =
  | "completed_ok"
  | "completed_concern"
  | "help_requested"
  | "no_answer"
  | "failed";

export type Member = {
  id: string;
  name: string;
  phoneNumber: string;
  timezone: string;
  preferredCallTime: string;
  isActive: boolean;
  caregiverIds: string[];
};

export type Caregiver = {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
};

export type CallAttempt = {
  id: string;
  memberId: string;
  memberName: string;
  scheduledFor: string;
  startedAt?: string;
  endedAt?: string;
  status: CallAttemptStatus;
  summary: string;
  alertSent: boolean;
};
