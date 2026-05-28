"use client";

import { useEffect, useMemo, useState } from "react";

type CampaignStatus = "Planned" | "Ready" | "Live" | "Paused" | "Done";
type ReviewStatus = "Draft" | "Review" | "Winner" | "Paused";
type ChecklistStatus = "Not started" | "In progress" | "Done";

type BudgetRow = {
  id: string;
  channel: string;
  planned: number;
  role: string;
  defaultSent: string;
};

type BudgetState = {
  spent: number;
  sent: string;
  status: CampaignStatus;
  notes: string;
};

type ChecklistItem = {
  id: string;
  task: string;
  owner: string;
  detail: string;
};

type ChecklistState = {
  status: ChecklistStatus;
  notes: string;
};

type AdVariant = {
  id: string;
  channel: string;
  angle: string;
  label: string;
  headline: string;
  primaryText: string;
  cta: string;
};

type AdVariantState = {
  status: ReviewStatus;
  notes: string;
};

type MediaTarget = {
  id: string;
  channel: string;
  name: string;
  audience: string;
  adModel: string;
  strategy: string;
};

type MediaTargetState = {
  status: CampaignStatus;
  sent: string;
  notes: string;
};

const STORAGE_KEY = "dailycall-marketing-launch-v1";
const TOTAL_BUDGET = 5000;

const budgetRows: BudgetRow[] = [
  {
    id: "meta-demo",
    channel: "Meta demo call campaign",
    planned: 1200,
    role: "Optimize for free 1-minute demo calls. Lower friction, captures phone numbers, and lets the product sell itself.",
    defaultSent: "Not live",
  },
  {
    id: "meta-trial",
    channel: "Meta trial campaign",
    planned: 800,
    role: "Direct to /signup for warmer traffic that is ready to start the 14-day trial.",
    defaultSent: "Not live",
  },
  {
    id: "google-search",
    channel: "Google Search",
    planned: 1000,
    role: "High-intent, low-volume keywords. Use phrase match for Tier 1 and competitor searches.",
    defaultSent: "Not live",
  },
  {
    id: "reddit",
    channel: "Reddit + organic seeding",
    planned: 300,
    role: "Caregiver communities. Answer honestly first, then test a low-budget Reddit ad or relevant founder post.",
    defaultSent: "Not live",
  },
  {
    id: "creators",
    channel: "Creator seeding",
    planned: 500,
    role: "3-5 eldercare/caregiver-daughter creators with 5K-50K followers. Offer free trial, no script.",
    defaultSent: "Not sent",
  },
  {
    id: "reserve",
    channel: "Winner reserve",
    planned: 500,
    role: "Hold until week 2, then push into the channel and angle with the clearest signal.",
    defaultSent: "Held",
  },
  {
    id: "buffer",
    channel: "Unassigned test buffer",
    planned: 700,
    role: "Remaining room inside the $5K cap. Assign only after early data shows where it belongs.",
    defaultSent: "Held",
  },
];

const checklistItems: ChecklistItem[] = [
  {
    id: "tracking",
    task: "Install conversion tracking",
    owner: "Admin",
    detail: "Meta Pixel, Google Tag, demo call requested, trial started, and paid conversion events.",
  },
  {
    id: "demo-hero",
    task: "Make demo the primary ad destination",
    owner: "Site",
    detail: "Ads should lead to the free 1-minute demo first, with signup as the lower-funnel path.",
  },
  {
    id: "creative",
    task: "Produce creative set",
    owner: "Marketing",
    detail: "3 angles x 3 creatives. Prioritize real-feeling phone photography and one silent phone-ringing video.",
  },
  {
    id: "meta-launch",
    task: "Launch Meta at 50% budget",
    owner: "Marketing",
    detail: "Run demo and trial campaigns in parallel; kill weak angles quickly.",
  },
  {
    id: "search-launch",
    task: "Launch exact/phrase search",
    owner: "Marketing",
    detail: "Tier 1 and competitor keywords first. Add negatives before launch.",
  },
  {
    id: "creator-list",
    task: "Build creator seed list",
    owner: "Marketing",
    detail: "Find 3-5 eldercare/caregiver creators and track outreach, trial setup, and follow-up.",
  },
  {
    id: "fb-admins",
    task: "Identify Facebook group admins",
    owner: "Marketing",
    detail: "Review group about sections, find creators/moderators, and note external blogs, consulting businesses, podcasts, or sponsorship paths.",
  },
  {
    id: "paid-partnership-pitch",
    task: "Prepare paid partnership pitch",
    owner: "Marketing",
    detail: "Pitch vetted-resource mentions, admin-pinned posts, service reviews, newsletter placements, or sponsored content instead of organic brand posting.",
  },
  {
    id: "week-four-readout",
    task: "Week 4 data readout",
    owner: "Admin",
    detail: "Read cost per demo, demo-to-trial, trial-to-paid, and CAC by channel and angle.",
  },
];

const adVariants: AdVariant[] = [
  {
    id: "meta-guilt-a",
    channel: "Meta",
    angle: "Long-distance guilt",
    label: "Ad A",
    headline: "You can't drive over every day. This can call her.",
    primaryText:
      "I live three time zones from my mom. I used to call every other day and still feel guilty about the days I didn't.\n\nNow she gets a friendly check-in call every morning at 9, right after her coffee. I get a text after - how she sounded, what she talked about, whether anything seemed off.\n\nIt's not a replacement for me calling. It's the floor underneath it.\n\nNo app for her to learn. Works on her landline. 14-day free trial.",
    cta: "Try a free 1-minute demo",
  },
  {
    id: "meta-guilt-b",
    channel: "Meta",
    angle: "Long-distance guilt",
    label: "Ad B",
    headline: "The call I can't always make.",
    primaryText:
      "Some days I'm in back-to-back meetings. Some days I just forget until 10pm and feel awful.\n\nDailyCall is a warm daily phone call for my dad - same time every morning, no app, no screen. I get a quick text summary after. If he doesn't pick up, I know.\n\nIt hasn't replaced our calls. It's made me less anxious about the days between them.",
    cta: "See how it works",
  },
  {
    id: "meta-lonely-a",
    channel: "Meta",
    angle: "Loneliness / alone all day",
    label: "Ad A",
    headline: "Mom lives alone. Some days I'm her only conversation.",
    primaryText:
      "After my dad passed, my mom went quiet. Not sad exactly - just fewer words, less to say when I called.\n\nWe started her on a daily companion call. Same friendly voice every morning. They talk about her garden, her shows, her sister in Florida. Five, ten minutes.\n\nShe sounds brighter on the days the call comes. That's the whole review.",
    cta: "Try a free demo call",
  },
  {
    id: "meta-lonely-b",
    channel: "Meta",
    angle: "Loneliness / alone all day",
    label: "Ad B",
    headline: "43% of adults over 60 report feeling lonely.",
    primaryText:
      "A daily phone call won't fix loneliness. But a warm, familiar voice - same time every day, asking how they slept, remembering the grandkids' names - adds up.\n\nDailyCall is a daily companion call for aging parents. No app. No smartphone needed. Works on any phone.\n\nHear a 1-minute sample before you sign up.",
    cta: "Hear a demo",
  },
  {
    id: "meta-no-app-a",
    channel: "Meta",
    angle: "She won't use an app",
    label: "Ad A",
    headline: "She won't use an app. She'll answer the phone.",
    primaryText:
      "Every senior tech product assumes Mom will download something, charge it, and learn it. Mine won't. Yours probably won't either.\n\nDailyCall is just a phone call. Rings her regular phone at a time she chooses. A warm voice that knows her name and remembers what she said yesterday.\n\nThat's it. That's the whole thing.",
    cta: "Try a free demo",
  },
  {
    id: "meta-no-app-b",
    channel: "Meta",
    angle: "She won't use an app",
    label: "Ad B",
    headline: "No app. No tablet. No password. Just a phone call.",
    primaryText:
      "We tried the smart speaker. We tried the tablet. We tried the medical alert thing with the screen. None of it stuck.\n\nWhat stuck: a friendly daily phone call. Same time every morning. He picks up like it's an old friend, because at this point it kind of is.\n\nSetup takes 2 minutes on your phone. He never has to touch anything.",
    cta: "Set up a call",
  },
  {
    id: "search-base",
    channel: "Google Search",
    angle: "High-intent search",
    label: "Search Ad",
    headline: "Daily Phone Calls For Aging Parents | No App. Works On Any Phone. | Free 14-Day Trial",
    primaryText:
      "A warm AI companion call for your mom or dad - same time daily, on their regular phone. Family text summary after every call.\n\nSetup takes 2 minutes. No credit card. Cancel anytime. Try a free 1-minute demo call now.",
    cta: "Try demo",
  },
];

const keywordGroups = [
  {
    title: "Tier 1: highest intent",
    copy: "companion calls for elderly, companion calls for seniors, daily check in service for seniors, daily phone call service for seniors, check in calls for elderly parents, wellness call service for seniors, reassurance calls for elderly, AI companion for seniors",
  },
  {
    title: "Tier 2: problem-aware",
    copy: "how to check on elderly parent from far away, long distance caregiving solutions, elderly parent lives alone what to do, mom lives alone and I worry, how to help lonely elderly parent",
  },
  {
    title: "Tier 3: competitors",
    copy: "papa app alternative, carelinx alternative, grandpad alternative, elliq alternative, careyaya alternative, intuition robotics alternative, alternatives to medical alert systems",
  },
  {
    title: "Day-one negatives",
    copy: "free, jobs, hiring, prank, spam, scam, robocall, call center, answering service, API, developer, crisis, suicide, hotline, nursing home, assisted living, medicare, medicaid, prayer line, chatbot",
  },
];

const mediaTargets: MediaTarget[] = [
  {
    id: "agingcare",
    channel: "Forum / publisher",
    name: "AgingCare.com Forum",
    audience: "High-intent adult children asking how to keep aging parents safe, independent, and less isolated.",
    adModel: "Premium banner ads, sponsored resource directory listings, and targeted email newsletter sponsorships.",
    strategy: "Treat as a qualified media buy. Lead with caregiver anxiety and peace of mind, not broad senior-tech messaging.",
  },
  {
    id: "dailycaring",
    channel: "Publisher / newsletter",
    name: "DailyCaring.com",
    audience: "Family caregivers looking for practical day-to-day help managing aging parents.",
    adModel: "Sponsorships, dedicated newsletter blasts, and sponsored educational/native content.",
    strategy: "Pitch educational content around daily check-ins, loneliness, and long-distance caregiving.",
  },
  {
    id: "working-daughter",
    channel: "Community / podcast",
    name: "Working Daughter",
    audience: "Career-focused women balancing jobs, families, and care for aging parents.",
    adModel: "Custom brand partnerships, podcast reads, newsletter features, and display placements.",
    strategy: "Position DailyCall as time relief and emotional backup for daughters carrying the invisible load.",
  },
  {
    id: "reddit-agingparents",
    channel: "Reddit ads",
    name: "r/AgingParents",
    audience: "Adult children managing parents who live alone, face health declines, or show memory changes.",
    adModel: "Subreddit-targeted Reddit Ads. Avoid organic brand posting.",
    strategy: "Use pain-mirroring headlines like: Worried about Mom living alone? Get peace of mind with a friendly daily check-in call.",
  },
  {
    id: "reddit-caregiver",
    channel: "Reddit ads",
    name: "r/CaregiverSupport",
    audience: "Caregivers venting, seeking advice, and managing burnout.",
    adModel: "Subreddit-targeted Reddit Ads with careful comment monitoring.",
    strategy: "Keep copy quiet and human. Avoid polished promo tone; emphasize relief, not replacement.",
  },
  {
    id: "reddit-sandwich",
    channel: "Reddit ads",
    name: "r/SandwichGeneration",
    audience: "People caught between raising children, careers, and caring for aging parents.",
    adModel: "Small-budget targeted Reddit Ads.",
    strategy: "Test time-pressure and guilt messaging against the broader long-distance-care angle.",
  },
  {
    id: "fb-aging-parents",
    channel: "Facebook groups",
    name: "Parenting Aging Parents",
    audience: "Large support group of adult children looking for tools and reassurance.",
    adModel: "No direct self-promotion. Identify admins, then pitch a paid partnership, review, or admin-pinned vetted-resource post.",
    strategy: "Do not post organically as DailyCall unless approved. Use group language to shape paid Meta ads and partnership copy.",
  },
  {
    id: "fb-caring-elderly",
    channel: "Facebook groups",
    name: "Caring for Elderly Parents",
    audience: "High-volume caregivers discussing long-distance care, isolation, and daily stress.",
    adModel: "Group rules usually restrict promotion. Reach out to admins directly for a paid mention, pinned resource, or approved review.",
    strategy: "Mine language and objections, then turn the strongest themes into Meta ad variants.",
  },
  {
    id: "fb-caregiver-space",
    channel: "Facebook groups",
    name: "The Caregiver Space Community",
    audience: "Caregivers looking for support around burnout and ongoing emotional load.",
    adModel: "Moderated community. Sponsored/partner route preferred.",
    strategy: "Approach with caregiver relief education; avoid hard-sell product drops.",
  },
  {
    id: "chris-punsalan",
    channel: "Influencer",
    name: "Chris Punsalan (@chrispunsalan)",
    audience: "Mass-reach caregiving audience built around the emotional reality of caring for his grandmother.",
    adModel: "High-cost creator partnership. Best for major awareness if budget expands beyond the first $5K test.",
    strategy: "Track as aspirational/high-reach. Use smaller creators first unless a low-risk trial/review path appears.",
  },
  {
    id: "adria-thompson",
    channel: "Influencer",
    name: "Adria Thompson (@belightcare)",
    audience: "Dementia care education audience of adult children seeking daily behavioral and safety guidance.",
    adModel: "Sponsored educational content, story/reel review, or caregiver-resource mention.",
    strategy: "Position DailyCall around routine, reassurance, and family visibility without making dementia-care claims.",
  },
  {
    id: "lance-slatton",
    channel: "Influencer / podcast",
    name: "Lance A. Slatton / All Home Care Matters",
    audience: "Family caregiving and senior-care decision makers consuming YouTube and podcast content.",
    adModel: "Mid-roll podcast sponsorships, YouTube features, or sponsored interviews.",
    strategy: "Good fit for explaining the product clearly and reaching families comparing care options.",
  },
  {
    id: "matt-cauli",
    channel: "Influencer",
    name: "Matt Cauli (@thededicatedcaregiver)",
    audience: "Highly engaged caregiving audience discussing practical products that make solo living safer.",
    adModel: "Dedicated review video, story sequence, or free trial for parent in exchange for honest review.",
    strategy: "Prioritize authenticity. No hard script; ask for honest experience and comment-section learnings.",
  },
];

const adBuyingFramework = [
  {
    channel: "Direct Web Media",
    platform: "AgingCare.com / DailyCaring",
    action: "Purchase newsletter sponsorship space, banner inventory, or directory listing.",
    priority: "Tier 1 - highest intent",
  },
  {
    channel: "Reddit Native Ads",
    platform: "Reddit Ads Manager",
    action: "Target only r/AgingParents first; keep copy pain-specific and non-corporate.",
    priority: "Tier 1 - lowest CPC test",
  },
  {
    channel: "Niche Publications",
    platform: "Working Daughter",
    action: "Pitch sponsored blog post, newsletter placement, or podcast shoutout directly.",
    priority: "Tier 2 - high disposable income",
  },
  {
    channel: "Micro-influencers",
    platform: "Caregiver creators with 10K-100K followers",
    action: "Send free trial codes for their parents in exchange for a dedicated honest review video.",
    priority: "Tier 2 - highest trust",
  },
];

function defaultBudgetState(row: BudgetRow): BudgetState {
  return { spent: 0, sent: row.defaultSent, status: "Planned", notes: "" };
}

function defaultChecklistState(): ChecklistState {
  return { status: "Not started", notes: "" };
}

function defaultAdState(): AdVariantState {
  return { status: "Review", notes: "" };
}

function defaultMediaTargetState(): MediaTargetState {
  return { status: "Planned", sent: "Not contacted", notes: "" };
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function statusClass(status: CampaignStatus | ChecklistStatus | ReviewStatus) {
  const base = "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide";
  if (status === "Done" || status === "Winner") return `${base} bg-sage/15 text-sage`;
  if (status === "Live" || status === "Ready" || status === "In progress" || status === "Review") return `${base} bg-brandBlue/10 text-brandButtonBlue`;
  if (status === "Paused") return `${base} bg-red-50 text-red-700`;
  return `${base} bg-slate-100 text-slate-600`;
}

export function MarketingDashboardClient() {
  const [budgetState, setBudgetState] = useState<Record<string, BudgetState>>(() =>
    Object.fromEntries(budgetRows.map((row) => [row.id, defaultBudgetState(row)])),
  );
  const [checklistState, setChecklistState] = useState<Record<string, ChecklistState>>(() =>
    Object.fromEntries(checklistItems.map((item) => [item.id, defaultChecklistState()])),
  );
  const [adState, setAdState] = useState<Record<string, AdVariantState>>(() =>
    Object.fromEntries(adVariants.map((variant) => [variant.id, defaultAdState()])),
  );
  const [mediaTargetState, setMediaTargetState] = useState<Record<string, MediaTargetState>>(() =>
    Object.fromEntries(mediaTargets.map((target) => [target.id, defaultMediaTargetState()])),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          budgetState?: Record<string, BudgetState>;
          checklistState?: Record<string, ChecklistState>;
          adState?: Record<string, AdVariantState>;
          mediaTargetState?: Record<string, MediaTargetState>;
        };
        if (parsed.budgetState) setBudgetState((current) => ({ ...current, ...parsed.budgetState }));
        if (parsed.checklistState) setChecklistState((current) => ({ ...current, ...parsed.checklistState }));
        if (parsed.adState) setAdState((current) => ({ ...current, ...parsed.adState }));
        if (parsed.mediaTargetState) setMediaTargetState((current) => ({ ...current, ...parsed.mediaTargetState }));
      } catch {
        // Ignore corrupted local dashboard state and continue with source-plan defaults.
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ budgetState, checklistState, adState, mediaTargetState }));
  }, [adState, budgetState, checklistState, loaded, mediaTargetState]);

  const totals = useMemo(() => {
    const planned = budgetRows.reduce((total, row) => total + row.planned, 0);
    const spent = budgetRows.reduce((total, row) => total + (budgetState[row.id]?.spent ?? 0), 0);
    const liveRows = budgetRows.filter((row) => budgetState[row.id]?.status === "Live").length;
    const winners = adVariants.filter((variant) => adState[variant.id]?.status === "Winner").length;
    const activeTargets = mediaTargets.filter((target) => {
      const status = mediaTargetState[target.id]?.status;
      return status === "Ready" || status === "Live" || status === "Done";
    }).length;
    return { planned, spent, remaining: TOTAL_BUDGET - spent, unplanned: TOTAL_BUDGET - planned, liveRows, winners, activeTargets };
  }, [adState, budgetState, mediaTargetState]);

  const groupedVariants = useMemo(() => {
    return adVariants.reduce<Record<string, AdVariant[]>>((groups, variant) => {
      const key = `${variant.channel}: ${variant.angle}`;
      groups[key] = [...(groups[key] ?? []), variant];
      return groups;
    }, {});
  }, []);

  function updateBudget(id: string, patch: Partial<BudgetState>) {
    setBudgetState((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function updateChecklist(id: string, patch: Partial<ChecklistState>) {
    setChecklistState((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function updateAd(id: string, patch: Partial<AdVariantState>) {
    setAdState((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function updateMediaTarget(id: string, patch: Partial<MediaTargetState>) {
    setMediaTargetState((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  return (
    <div className="grid gap-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Budget cap" value={money(TOTAL_BUDGET)} />
        <Metric label="Planned" value={money(totals.planned)} />
        <Metric label="Spent" value={money(totals.spent)} />
        <Metric label="Remaining" value={money(totals.remaining)} />
        <Metric label="Targets active" value={totals.activeTargets.toString()} />
      </section>

      <section className="rounded-[2rem] bg-ink p-6 text-cream shadow-sm md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cream/60">campaign frame</p>
            <h2 className="mt-3 text-3xl font-bold">Buy signal, not even channel coverage.</h2>
            <p className="mt-4 leading-7 text-cream/75">
              The first spend should find one channel where CAC can stay under about $80. Track cost per demo call, demo-to-trial rate, and trial-to-paid rate before scaling anything.
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="Live channels" value={totals.liveRows.toString()} />
              <MiniMetric label="Unplanned room" value={money(totals.unplanned)} />
            </div>
            <p className="text-sm leading-6 text-cream/70">
              Weeks 1-3: launch at 50%, kill weak angles, double winners. Week 4: read the data. Weeks 5-6: concentrate spend or revisit positioning.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">budget tracker</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Planned, spent, sent, notes</h2>
          </div>
          <p className="text-sm font-semibold text-slate-500">Saved locally in this admin browser.</p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1.2fr_0.55fr_0.55fr_0.8fr_0.75fr_1.2fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
            <span>Channel</span>
            <span>Planned</span>
            <span>Spent</span>
            <span>Status</span>
            <span>Sent/live</span>
            <span>Notes</span>
          </div>
          <div className="divide-y divide-slate-100">
            {budgetRows.map((row) => {
              const state = budgetState[row.id] ?? defaultBudgetState(row);
              return (
                <div key={row.id} className="grid gap-4 p-4 xl:grid-cols-[1.2fr_0.55fr_0.55fr_0.8fr_0.75fr_1.2fr] xl:items-start">
                  <div>
                    <p className="font-bold text-ink">{row.channel}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{row.role}</p>
                  </div>
                  <p className="font-bold text-ink">{money(row.planned)}</p>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span className="xl:hidden">Spent</span>
                    <input
                      type="number"
                      min="0"
                      value={state.spent}
                      onChange={(event) => updateBudget(row.id, { spent: numberValue(event.target.value) })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brandPink"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span className="xl:hidden">Status</span>
                    <select
                      value={state.status}
                      onChange={(event) => updateBudget(row.id, { status: event.target.value as CampaignStatus })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brandPink"
                    >
                      {(["Planned", "Ready", "Live", "Paused", "Done"] satisfies CampaignStatus[]).map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <span className={statusClass(state.status)}>{state.status}</span>
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span className="xl:hidden">Sent/live</span>
                    <input
                      value={state.sent}
                      onChange={(event) => updateBudget(row.id, { sent: event.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brandPink"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span className="xl:hidden">Notes</span>
                    <textarea
                      value={state.notes}
                      onChange={(event) => updateBudget(row.id, { notes: event.target.value })}
                      rows={3}
                      placeholder="What changed, results, next move..."
                      className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-ink outline-none focus:border-brandPink"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">launch readiness</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Checklist</h2>
          <div className="mt-6 grid gap-4">
            {checklistItems.map((item) => {
              const state = checklistState[item.id] ?? defaultChecklistState();
              return (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-bold text-ink">{item.task}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.owner}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                    <span className={statusClass(state.status)}>{state.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[0.6fr_1fr]">
                    <select
                      value={state.status}
                      onChange={(event) => updateChecklist(item.id, { status: event.target.value as ChecklistStatus })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brandPink"
                    >
                      {(["Not started", "In progress", "Done"] satisfies ChecklistStatus[]).map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <input
                      value={state.notes}
                      onChange={(event) => updateChecklist(item.id, { notes: event.target.value })}
                      placeholder="Owner notes"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brandPink"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">google search</p>
          <h2 className="mt-3 text-3xl font-bold text-ink">Keywords and negatives</h2>
          <div className="mt-6 grid gap-4">
            {keywordGroups.map((group) => (
              <div key={group.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-ink">{group.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{group.copy}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">audience directory</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Communities, forums, and media buys</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Use paid placements or approved sponsorships. Avoid organic brand drops in moderated caregiver communities.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {mediaTargets.map((target) => {
            const state = mediaTargetState[target.id] ?? defaultMediaTargetState();
            return (
              <article key={target.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr] xl:items-start">
                  <div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{target.channel}</p>
                        <h3 className="mt-2 text-xl font-bold text-ink">{target.name}</h3>
                      </div>
                      <span className={statusClass(state.status)}>{state.status}</span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <InfoBlock label="Audience" value={target.audience} />
                      <InfoBlock label="Ad model" value={target.adModel} />
                      <InfoBlock label="Strategy" value={target.strategy} />
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Status
                        <select
                          value={state.status}
                          onChange={(event) => updateMediaTarget(target.id, { status: event.target.value as CampaignStatus })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brandPink"
                        >
                          {(["Planned", "Ready", "Live", "Paused", "Done"] satisfies CampaignStatus[]).map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Sent / outreach
                        <input
                          value={state.sent}
                          onChange={(event) => updateMediaTarget(target.id, { sent: event.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brandPink"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Notes
                      <textarea
                        value={state.notes}
                        onChange={(event) => updateMediaTarget(target.id, { notes: event.target.value })}
                        rows={3}
                        placeholder="Contact, rate card, moderator rules, result..."
                        className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-ink outline-none focus:border-brandPink"
                      />
                    </label>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] bg-ink p-6 text-cream shadow-sm md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cream/60">buying framework</p>
            <h2 className="mt-3 text-3xl font-bold">Prioritize qualified buyers first.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-cream/70">
            Start with direct media and Reddit signal, then layer niche publications and creator reviews once messaging is clearer.
          </p>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          {adBuyingFramework.map((item) => (
            <article key={`${item.channel}-${item.platform}`} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-brandPinkLight">{item.priority}</p>
              <h3 className="mt-3 text-lg font-bold text-cream">{item.channel}</h3>
              <p className="mt-2 text-sm font-semibold text-cream/85">{item.platform}</p>
              <p className="mt-3 text-sm leading-6 text-cream/70">{item.action}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/85 p-6 shadow-sm ring-1 ring-black/5 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sage">copy review</p>
            <h2 className="mt-3 text-3xl font-bold text-ink">Ad-copy variations</h2>
          </div>
          <p className="text-sm font-semibold text-slate-500">Mark each variation as draft, review, winner, or paused.</p>
        </div>

        <div className="mt-6 grid gap-6">
          {Object.entries(groupedVariants).map(([group, variants]) => (
            <div key={group} className="rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <h3 className="text-xl font-bold text-ink">{group}</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {variants.map((variant) => {
                  const state = adState[variant.id] ?? defaultAdState();
                  return (
                    <article key={variant.id} className="grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{variant.label}</p>
                          <h4 className="mt-2 text-lg font-bold leading-6 text-ink">{variant.headline}</h4>
                        </div>
                        <span className={statusClass(state.status)}>{state.status}</span>
                      </div>
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{variant.primaryText}</p>
                      <p className="text-sm font-bold text-brandButtonBlue">CTA: {variant.cta}</p>
                      <div className="grid gap-3 md:grid-cols-[0.5fr_1fr]">
                        <select
                          value={state.status}
                          onChange={(event) => updateAd(variant.id, { status: event.target.value as ReviewStatus })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brandPink"
                        >
                          {(["Draft", "Review", "Winner", "Paused"] satisfies ReviewStatus[]).map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                        <input
                          value={state.notes}
                          onChange={(event) => updateAd(variant.id, { notes: event.target.value })}
                          placeholder="Review notes, edits, performance..."
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brandPink"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-black/5 md:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink md:text-3xl">{value}</p>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-cream/55">{label}</p>
      <p className="mt-2 text-2xl font-bold text-cream">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
