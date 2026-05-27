export type SeoLandingPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string;
    bullets?: string[];
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  related: string[];
};

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "daily-check-in-calls-for-seniors",
    title: "Daily Check-In Calls for Seniors",
    description: "Daily check-in calls for seniors by regular phone, with friendly conversation and simple updates for families.",
    eyebrow: "Daily senior check-ins",
    h1: "Daily check-in calls for seniors",
    intro:
      "DailyCall helps families create a predictable phone routine for an older loved one. Each call is designed to feel warm, calm, and familiar, while giving family members simple visibility into whether the call happened.",
    sections: [
      {
        heading: "A familiar phone call, not another app",
        body:
          "Many seniors prefer the phone they already know. DailyCall works by regular phone call, so there is no app to install, no screen to learn, and no password for your loved one to remember.",
        bullets: ["Works with mobile phones and landlines", "Scheduled around a familiar daily routine", "Built for short, friendly conversations"],
      },
      {
        heading: "Helpful visibility for families",
        body:
          "A daily call can give adult children and caregivers a steadier sense of what is happening day to day, especially when they live far away or cannot call as often as they want.",
        bullets: ["Call status and missed-call visibility", "Conversation summaries and highlights", "A gentle routine families can build around"],
      },
    ],
    faqs: [
      {
        question: "Do seniors need a smartphone for DailyCall?",
        answer: "No. DailyCall works through regular phone calls and can call mobile phones or landlines.",
      },
      {
        question: "Can families choose the call time?",
        answer: "Yes. Families can choose a schedule that fits their loved one's normal routine.",
      },
    ],
    related: ["wellness-check-calls", "companionship-calls-for-seniors", "phone-check-in-service-for-aging-parents"],
  },
  {
    slug: "ai-companion-for-elderly",
    title: "AI Companion for Elderly Loved Ones",
    description: "An AI companion for elderly loved ones that calls by regular phone and supports conversation, routine, and family updates.",
    eyebrow: "AI phone companion",
    h1: "AI companion for elderly loved ones",
    intro:
      "DailyCall is an AI phone companion designed for older adults who benefit from friendly conversation and a consistent daily touchpoint. It is honest about being AI and is built to support, not replace, human connection.",
    sections: [
      {
        heading: "Designed for comfort and clarity",
        body:
          "The experience is intentionally simple: your loved one receives a phone call, hears a friendly voice, and can talk about their day, memories, hobbies, family, routines, or whatever feels natural.",
        bullets: ["Clear AI disclosure", "No app or device setup", "Personalized conversation topics"],
      },
      {
        heading: "Built around family peace of mind",
        body:
          "Families can use DailyCall to add a steady layer of connection between their own calls, visits, and caregiving routines.",
        bullets: ["Helpful summaries after calls", "Missed-call visibility", "Conversation context that can improve over time"],
      },
    ],
    faqs: [
      {
        question: "Will my loved one know DailyCall is AI?",
        answer: "Yes. DailyCall is designed to be introduced honestly as an AI companion, not as a human caller.",
      },
      {
        question: "Can the AI companion remember preferences?",
        answer: "Yes. Families can add interests, routines, names, and topics that help conversations feel more personal.",
      },
    ],
    related: ["daily-check-in-calls-for-seniors", "senior-loneliness-solutions", "companionship-calls-for-seniors"],
  },
  {
    slug: "wellness-check-calls",
    title: "Wellness Check Calls for Seniors",
    description: "Wellness check calls for seniors that create a daily phone routine and help families notice missed calls or changing patterns.",
    eyebrow: "Wellness check calls",
    h1: "Wellness check calls by regular phone",
    intro:
      "DailyCall provides friendly wellness check calls that help older adults maintain a simple daily routine while giving families useful call status and conversation updates.",
    sections: [
      {
        heading: "A non-clinical daily touchpoint",
        body:
          "DailyCall is not medical care or emergency response. It is a practical companion call that can help families stay more aware of everyday routines and missed calls.",
        bullets: ["Daily call status", "Simple family updates", "Designed to complement family and caregiving support"],
      },
      {
        heading: "Less friction for seniors",
        body:
          "Because calls happen by phone, DailyCall can fit into familiar habits without asking an older adult to manage new technology.",
        bullets: ["No app required", "No password required", "Landline-friendly"],
      },
    ],
    faqs: [
      {
        question: "Is DailyCall an emergency response service?",
        answer: "No. DailyCall is not an emergency response service, medical provider, or substitute for professional care.",
      },
      {
        question: "What makes it a wellness check?",
        answer: "The call creates a regular opportunity to connect, notice missed calls, and receive simple updates about the conversation.",
      },
    ],
    related: ["senior-safety-check-calls", "daily-check-in-calls-for-seniors", "caregiver-peace-of-mind"],
  },
  {
    slug: "phone-check-in-service-for-aging-parents",
    title: "Phone Check-In Service for Aging Parents",
    description: "A phone check-in service for aging parents that works by regular calls and keeps families updated without requiring an app.",
    eyebrow: "Aging parent check-ins",
    h1: "Phone check-in service for aging parents",
    intro:
      "DailyCall helps adult children set up friendly phone check-ins for aging parents, especially when distance, work, or caregiver stress makes daily calling hard to sustain.",
    sections: [
      {
        heading: "Built for real family routines",
        body:
          "Aging parents often need connection more than complicated technology. DailyCall creates a predictable call that can support family relationships without making the senior feel monitored.",
        bullets: ["Regular phone call experience", "Custom call timing", "Family text updates"],
      },
      {
        heading: "A useful layer between visits",
        body:
          "DailyCall does not replace family calls or visits. It gives families another daily touchpoint so support can feel more consistent.",
        bullets: ["Missed-call awareness", "Conversation summaries", "A softer alternative to surveillance-style tools"],
      },
    ],
    faqs: [
      {
        question: "Can I use DailyCall if I live far from my parent?",
        answer: "Yes. DailyCall is designed for families who want a simple way to support an aging parent remotely.",
      },
      {
        question: "Can calls be personalized?",
        answer: "Yes. Families can add names, interests, routines, and topics that matter to their loved one.",
      },
    ],
    related: ["how-to-check-on-aging-parents-remotely", "my-elderly-parent-lives-alone", "caregiver-peace-of-mind"],
  },
  {
    slug: "companionship-calls-for-seniors",
    title: "Companionship Calls for Seniors",
    description: "Companionship calls for seniors by regular phone, designed for conversation, routine, and family peace of mind.",
    eyebrow: "Senior companionship",
    h1: "Companionship calls for seniors",
    intro:
      "DailyCall gives older adults a friendly voice to talk with by regular phone. Calls can include everyday conversation, memories, music, hobbies, trivia, routines, and simple company.",
    sections: [
      {
        heading: "Conversation that feels easy",
        body:
          "The goal is a warm, patient conversation that feels natural and low-pressure. Families can choose topics and preferences so calls feel more familiar over time.",
        bullets: ["Friendly daily conversations", "Personalized topics", "Works without new technology"],
      },
      {
        heading: "Support without replacing family",
        body:
          "Companionship calls are best used as an extra layer of connection alongside family, friends, caregivers, community, and professional support.",
        bullets: ["Helpful between family calls", "Supports routine and connection", "Clear AI disclosure"],
      },
    ],
    faqs: [
      {
        question: "What do companionship calls talk about?",
        answer: "Calls can include routines, memories, family, hobbies, music, trivia, plans, or simple conversation about the day.",
      },
      {
        question: "Does this replace family calls?",
        answer: "No. DailyCall is designed to support family connection, not replace it.",
      },
    ],
    related: ["ai-companion-for-elderly", "senior-loneliness-solutions", "daily-check-in-calls-for-seniors"],
  },
  {
    slug: "senior-safety-check-calls",
    title: "Senior Safety Check Calls",
    description: "Senior safety check calls that help families notice missed calls and maintain a daily connection routine.",
    eyebrow: "Senior safety check calls",
    h1: "Senior safety check calls for daily reassurance",
    intro:
      "DailyCall helps families add a simple daily call routine for an older loved one. It is not emergency response, but it can help families notice missed calls and maintain regular connection.",
    sections: [
      {
        heading: "A practical daily signal",
        body:
          "For families, knowing whether a scheduled call was answered can be useful. It adds a small daily signal without requiring cameras, wearables, or a new device.",
        bullets: ["Missed-call visibility", "Works by regular phone", "Helpful family updates"],
      },
      {
        heading: "Safety with clear limits",
        body:
          "DailyCall is designed for companionship and routine check-ins. It should be paired with local emergency plans, caregivers, neighbors, or family follow-up when safety concerns are urgent.",
        bullets: ["Not emergency response", "Not medical advice", "Designed to support responsible family follow-up"],
      },
    ],
    faqs: [
      {
        question: "Can DailyCall detect emergencies?",
        answer: "No. DailyCall is not an emergency service and should not be used as the only safety plan for an at-risk senior.",
      },
      {
        question: "Why use safety check calls?",
        answer: "They help create a consistent touchpoint and make missed calls more visible to families.",
      },
    ],
    related: ["wellness-check-calls", "signs-an-aging-parent-needs-daily-check-ins", "caregiver-peace-of-mind"],
  },
  {
    slug: "my-elderly-parent-lives-alone",
    title: "My Elderly Parent Lives Alone",
    description: "Support ideas when an elderly parent lives alone, including daily phone check-ins, companionship calls, and family updates.",
    eyebrow: "Parent living alone",
    h1: "When your elderly parent lives alone",
    intro:
      "When an older parent lives alone, families often worry about loneliness, missed routines, and whether small changes are going unnoticed. DailyCall can add a steady daily phone touchpoint.",
    sections: [
      {
        heading: "A daily routine can reduce uncertainty",
        body:
          "A short daily call can help create rhythm and connection. It gives your parent a friendly conversation and gives you a clearer sense of whether the call was answered.",
        bullets: ["Friendly calls at familiar times", "No app required", "Helpful updates for family"],
      },
      {
        heading: "Support without making them feel watched",
        body:
          "Many older adults resist tools that feel like monitoring. DailyCall is framed as a companion call, not surveillance.",
        bullets: ["Regular phone experience", "Conversation-first design", "Designed to preserve dignity"],
      },
    ],
    faqs: [
      {
        question: "Is DailyCall useful for seniors living alone?",
        answer: "It can be useful as one layer of daily connection, especially when family cannot call every day.",
      },
      {
        question: "Should this replace local support?",
        answer: "No. Seniors living alone should still have family, neighbor, caregiver, medical, and emergency support plans as needed.",
      },
    ],
    related: ["senior-loneliness-solutions", "daily-check-in-calls-for-seniors", "how-to-check-on-aging-parents-remotely"],
  },
  {
    slug: "how-to-check-on-aging-parents-remotely",
    title: "How to Check on Aging Parents Remotely",
    description: "Ways to check on aging parents remotely with regular phone routines, family updates, and companion calls.",
    eyebrow: "Remote family support",
    h1: "How to check on aging parents remotely",
    intro:
      "Checking on aging parents remotely works best when support is predictable, respectful, and easy for them to accept. DailyCall helps families add a regular phone routine without requiring new technology.",
    sections: [
      {
        heading: "Use familiar communication first",
        body:
          "For many families, the best remote support starts with the ordinary phone. DailyCall uses that familiar channel to create a consistent check-in rhythm.",
        bullets: ["Daily phone touchpoint", "Landline and mobile support", "No app or login for the senior"],
      },
      {
        heading: "Look for patterns, not one-off moments",
        body:
          "Remote caregiving is easier when families can see patterns: answered calls, missed calls, mood changes, and topics that keep coming up.",
        bullets: ["Call status visibility", "Conversation summaries", "Helpful context for follow-up"],
      },
    ],
    faqs: [
      {
        question: "What is the easiest remote check-in for aging parents?",
        answer: "A regular phone call is often easiest because it uses technology the parent already understands.",
      },
      {
        question: "Can DailyCall help long-distance caregivers?",
        answer: "Yes. It is designed for families who need a simple daily touchpoint between their own calls and visits.",
      },
    ],
    related: ["phone-check-in-service-for-aging-parents", "caregiver-peace-of-mind", "my-elderly-parent-lives-alone"],
  },
  {
    slug: "signs-an-aging-parent-needs-daily-check-ins",
    title: "Signs an Aging Parent Needs Daily Check-Ins",
    description: "Common signs an aging parent may benefit from daily check-ins, routine phone calls, and family visibility.",
    eyebrow: "Caregiver signals",
    h1: "Signs an aging parent may need daily check-ins",
    intro:
      "Daily check-ins can help when an aging parent is becoming more isolated, missing routines, or needs more consistent connection. DailyCall gives families a simple phone-based way to add that support.",
    sections: [
      {
        heading: "Common reasons families add check-ins",
        body:
          "The right support depends on the person, but families often look for daily check-ins when they notice more isolation, missed calls, forgetfulness around routines, or growing caregiver worry.",
        bullets: ["More time spent alone", "Missed family calls", "Less predictable daily routines", "More worry between visits"],
      },
      {
        heading: "Start with a low-pressure routine",
        body:
          "A friendly call can be easier to accept than a monitoring device. DailyCall is designed to feel like a supportive daily conversation.",
        bullets: ["Companion-first framing", "Regular phone call", "Family text updates"],
      },
    ],
    faqs: [
      {
        question: "How do I introduce daily check-ins?",
        answer: "Frame them as friendly support and routine connection, not surveillance or loss of independence.",
      },
      {
        question: "What if my parent resists help?",
        answer: "Start small with a familiar call time and keep family calls going so DailyCall feels supportive rather than replacing anyone.",
      },
    ],
    related: ["daily-check-in-calls-for-seniors", "wellness-check-calls", "my-elderly-parent-lives-alone"],
  },
  {
    slug: "senior-loneliness-solutions",
    title: "Senior Loneliness Solutions",
    description: "Senior loneliness solutions that add routine, conversation, companionship calls, and family connection by regular phone.",
    eyebrow: "Loneliness support",
    h1: "Senior loneliness solutions built around conversation",
    intro:
      "Loneliness can build quietly when routines shrink, friends move away, or family lives far away. DailyCall adds a friendly phone-based conversation that can become part of the day.",
    sections: [
      {
        heading: "Connection works best as a routine",
        body:
          "A single call cannot solve loneliness. A consistent rhythm of calls, visits, activities, community, and family support can help make connection more reliable.",
        bullets: ["Daily companion calls", "Conversation about familiar topics", "Works alongside family and community support"],
      },
      {
        heading: "No new technology barrier",
        body:
          "Some loneliness solutions fail because they require an app, tablet, password, or new habit. DailyCall uses the regular phone instead.",
        bullets: ["No app required", "Landline-friendly", "Built for older adults who prefer phone calls"],
      },
    ],
    faqs: [
      {
        question: "Can phone calls help with loneliness?",
        answer: "Regular, friendly conversation can support connection, especially when paired with family, friends, community, and care resources.",
      },
      {
        question: "Is DailyCall enough by itself?",
        answer: "No single tool is enough for everyone. DailyCall is one layer of connection, not a replacement for human relationships.",
      },
    ],
    related: ["companionship-calls-for-seniors", "ai-companion-for-elderly", "my-elderly-parent-lives-alone"],
  },
  {
    slug: "caregiver-peace-of-mind",
    title: "Caregiver Peace of Mind",
    description: "Caregiver peace of mind through daily phone check-ins, missed-call visibility, and simple updates for families.",
    eyebrow: "Caregiver support",
    h1: "Caregiver peace of mind between calls and visits",
    intro:
      "Caregiving often means carrying worry even when everything is probably fine. DailyCall gives families a simple daily touchpoint that can reduce uncertainty between their own calls and visits.",
    sections: [
      {
        heading: "A small daily signal",
        body:
          "Knowing whether a call was answered and what came up in conversation can help caregivers decide when to follow up and when to breathe a little easier.",
        bullets: ["Answered and missed-call visibility", "Conversation summaries", "Routine support for families at a distance"],
      },
      {
        heading: "Support that preserves dignity",
        body:
          "DailyCall is designed as a friendly companion call, not a surveillance product. It helps families stay connected without making the senior feel watched.",
        bullets: ["Phone-based experience", "Clear AI disclosure", "No camera or wearable required"],
      },
    ],
    faqs: [
      {
        question: "Can DailyCall reduce caregiver worry?",
        answer: "It can help reduce uncertainty by adding a regular call routine and simple family updates.",
      },
      {
        question: "Does DailyCall replace caregivers?",
        answer: "No. It supports families and caregivers but does not replace human care, medical support, or emergency planning.",
      },
    ],
    related: ["how-to-check-on-aging-parents-remotely", "wellness-check-calls", "phone-check-in-service-for-aging-parents"],
  },
  {
    slug: "vancouver-senior-check-in-service",
    title: "Vancouver Senior Check-In Service",
    description: "A Vancouver senior check-in service for families who want daily phone calls, companionship, and updates for aging loved ones.",
    eyebrow: "Vancouver senior check-ins",
    h1: "Vancouver senior check-in service",
    intro:
      "DailyCall supports Vancouver-area families with daily phone check-ins for older loved ones. The service is remote, phone-based, and designed for seniors who prefer a familiar call.",
    sections: [
      {
        heading: "Helpful for busy or long-distance families",
        body:
          "Whether family is across Metro Vancouver, elsewhere in British Columbia, or outside Canada, DailyCall can add a daily touchpoint by regular phone.",
        bullets: ["Phone calls for seniors in Vancouver", "Family text updates", "No app required for the senior"],
      },
      {
        heading: "Built for North American families",
        body:
          "DailyCall is designed for families in Canada and the United States who want simple companion calls, wellness check-ins, and missed-call visibility.",
        bullets: ["Canada and U.S. support", "Landline and mobile calls", "Privacy-focused family updates"],
      },
    ],
    faqs: [
      {
        question: "Does DailyCall work in Vancouver?",
        answer: "Yes. DailyCall can support Vancouver families and seniors by regular phone call.",
      },
      {
        question: "Is this an in-person Vancouver care service?",
        answer: "No. DailyCall is a remote phone-based companion and check-in service, not in-person care.",
      },
    ],
    related: ["daily-check-in-calls-for-seniors", "wellness-check-calls", "caregiver-peace-of-mind"],
  },
  {
    slug: "toronto-daily-calls-for-seniors",
    title: "Toronto Daily Calls for Seniors",
    description: "Daily calls for seniors in Toronto, with phone-based companionship, wellness check-ins, and family updates.",
    eyebrow: "Toronto daily calls",
    h1: "Toronto daily calls for seniors",
    intro:
      "DailyCall helps Toronto families set up regular companion calls for older loved ones by phone. It is designed for connection, routine, and simple family visibility.",
    sections: [
      {
        heading: "Phone-first support for seniors",
        body:
          "DailyCall works without asking seniors to install an app or learn a new device. Calls arrive on the phone they already use.",
        bullets: ["Daily phone calls in Toronto", "Works with mobile phones and landlines", "Friendly conversation and check-ins"],
      },
      {
        heading: "Family text updates",
        body:
          "Families can receive useful call visibility so they know whether the call happened and what came up in conversation.",
        bullets: ["Answered and missed-call visibility", "Conversation highlights", "Designed for caregiver peace of mind"],
      },
    ],
    faqs: [
      {
        question: "Does DailyCall serve Toronto?",
        answer: "Yes. DailyCall can support Toronto families through remote phone-based companion calls.",
      },
      {
        question: "Can DailyCall call a Toronto landline?",
        answer: "Yes. DailyCall can call mobile phones and landlines.",
      },
    ],
    related: ["companionship-calls-for-seniors", "phone-check-in-service-for-aging-parents", "senior-loneliness-solutions"],
  },
  {
    slug: "saskatoon-senior-wellness-calls",
    title: "Saskatoon Senior Wellness Calls",
    description: "Senior wellness calls in Saskatoon by regular phone, with friendly check-ins and simple family updates.",
    eyebrow: "Saskatoon wellness calls",
    h1: "Saskatoon senior wellness calls",
    intro:
      "DailyCall supports Saskatoon families with phone-based wellness calls for older loved ones. Calls are designed to be simple, warm, and easy to fit into a daily routine.",
    sections: [
      {
        heading: "A simple routine by phone",
        body:
          "DailyCall can help families create a daily check-in rhythm without requiring the senior to learn new technology.",
        bullets: ["Regular phone calls", "No app or password for the senior", "Custom call schedule"],
      },
      {
        heading: "Support for families near or far",
        body:
          "Whether family is in Saskatoon, elsewhere in Saskatchewan, or farther away, a daily call can provide connection and useful visibility.",
        bullets: ["Family updates", "Missed-call visibility", "Conversation summaries"],
      },
    ],
    faqs: [
      {
        question: "Does DailyCall work for families in Saskatoon?",
        answer: "Yes. DailyCall can provide remote senior wellness calls by regular phone.",
      },
      {
        question: "Is DailyCall medical monitoring?",
        answer: "No. DailyCall provides non-clinical companion and wellness check-in calls.",
      },
    ],
    related: ["wellness-check-calls", "daily-check-in-calls-for-seniors", "senior-safety-check-calls"],
  },
];

export const seoLandingPageMap = new Map(seoLandingPages.map((page) => [page.slug, page]));
