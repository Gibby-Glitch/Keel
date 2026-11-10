export const TRIGGERS = [
  "Stress",
  "Boredom",
  "After work",
  "Driving past the store",
  "Lonely",
  "Tired",
  "Anxious",
  "Celebrating",
  "Scrolling Instagram",
  "Sale or promo email",
  "Payday",
  "Weekend",
  "Argument",
  "Watching a game",
];

export const HALT = [
  { key: "Hungry", hint: "Eat something real first. Low blood sugar reads as a craving." },
  { key: "Angry", hint: "Name what you're angry about in one sentence, out loud or in the journal." },
  { key: "Lonely", hint: "Text or call one person. You don't have to mention the urge." },
  { key: "Tired", hint: "Rest is the need. Lie down for 15 minutes before deciding anything." },
];

export const COMMITMENT_CHIPS = [
  "Alcohol-free",
  "Weeknights dry",
  "No store runs after 6pm",
  "No impulse buys",
  "24-hour rule on purchases",
  "Unfollow shopping accounts",
  "Emergency fund",
  "Pay down the card",
  "Sleep better",
  "Move every day",
  "Cook at home",
  "Be present at night",
];

export const MOODS = [
  { v: 1, label: "Rough" },
  { v: 2, label: "Low" },
  { v: 3, label: "Okay" },
  { v: 4, label: "Good" },
  { v: 5, label: "Strong" },
];

export const EASE = [
  { v: 1, label: "Very hard" },
  { v: 2, label: "Hard" },
  { v: 3, label: "Manageable" },
  { v: 4, label: "Easier" },
  { v: 5, label: "Barely thought about it" },
];

/**
 * Journal prompts drawn from CBT thought records, relapse-prevention work and
 * expressive writing. Rotated daily.
 */
export const PROMPTS = [
  "What happened right before the urge showed up? Where were you, and what were you feeling?",
  "What did the drink or the purchase promise you tonight? What would it actually have delivered by tomorrow morning?",
  "Name one moment today that was easier than it would have been a month ago.",
  "If a friend were in your exact spot today, what would you tell them?",
  "What were you really needing when the urge hit — rest, company, a break, a reward?",
  "Write about the money: what is it going toward instead, and how does that feel?",
  "What's one thing you'd like tomorrow-morning-you to thank tonight-you for?",
  "Describe a craving you rode out. How strong was it at the peak, and how long until it eased?",
  "What story do you tell yourself that makes the store run feel necessary? Is it true?",
  "What's working right now that you want to keep doing?",
];

export const promptForToday = () => {
  const d = new Date();
  const n = Math.floor(d.getTime() / 86400000);
  return PROMPTS[n % PROMPTS.length];
};

export interface ScienceCard {
  id: string;
  title: string;
  summary: string;
  inKeel: string;
  source: string;
  url?: string;
}

/** Written in plain language; each card ties a finding to a feature in the app. */
export const SCIENCE: ScienceCard[] = [
  {
    id: "urge-surfing",
    title: "Urges rise, peak and pass",
    summary:
      "Mindfulness-Based Relapse Prevention teaches people to watch a craving like a wave instead of fighting or obeying it. In a randomized trial, MBRP and standard relapse prevention both beat 12-step–style treatment-as-usual at six months, and at one year MBRP showed the lowest drinking and drug use. Even small gains in mindfulness have been linked to weaker alcohol cravings.",
    inKeel:
      "The Urge tool runs a timed, guided ride-out and asks you to rate the craving before and after, so you build your own evidence that urges fade.",
    source: "Bowen et al., JAMA Psychiatry, 2014; Skrzynski et al., Psychology of Addictive Behaviors, 2023",
    url: "https://jamanetwork.com/journals/jamapsychiatry/fullarticle/1838998",
  },
  {
    id: "if-then",
    title: "Decide in advance with if-then plans",
    summary:
      "Implementation intentions link a specific cue to a specific response: “If I'm driving home past the store, then I'll call my brother instead.” A 2023 meta-analysis of 16 studies found they reduce weekly drinking. The effect is modest, strongest when people write plans out themselves, and fades over time — so plans work best when reviewed and refreshed.",
    inKeel:
      "Your Plan page stores if-then plans. The Urge tool shows them at the exact moment the cue hits, and the weekly review nudges you to update them.",
    source: "Cooke, McEwan & Norman, Drug and Alcohol Review, 2023",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10087331/",
  },
  {
    id: "habit-time",
    title: "New habits take weeks, not days — and one miss won't undo them",
    summary:
      "In a UCL study, the median time for a new daily behavior to feel automatic was 66 days, with individuals ranging from 18 to 254. Early repetitions produced the biggest gains, and missing a single day had little effect on the long-run curve.",
    inKeel:
      "Milestones are front-loaded (day 1, 3, 7, 14) to reward the fast early climb, day 66 is marked, and a slip resets a streak without erasing your totals.",
    source: "Lally et al., European Journal of Social Psychology, 2010",
    url: "https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674",
  },
  {
    id: "lapse",
    title: "A lapse is not a relapse",
    summary:
      "Relapse-prevention research describes the “abstinence violation effect”: after one slip, all-or-nothing thinking (“I've blown it anyway”) turns a single drink into a binge. Treating the slip as information — what was the trigger, what will I do next time — protects the progress already made.",
    inKeel:
      "Logging a slip asks what happened, keeps your savings total and longest streak intact, and offers to turn the trigger into a new if-then plan.",
    source: "Marlatt & Gordon, Relapse Prevention, 1985",
  },
  {
    id: "cbt-buying",
    title: "Compulsive buying responds to CBT",
    summary:
      "Shopping can become an escape from anxiety, sadness or emptiness, especially with one-click checkout. In a randomized trial, group CBT that targeted buying triggers, the thoughts and feelings around shopping and healthier coping cut compulsive buying, and the gains held at six-month follow-up.",
    inKeel:
      "Journal prompts follow a CBT thought record (trigger → thought → feeling → what actually happened), and trigger tags show which feelings drive your spending.",
    source: "Mueller et al., Journal of Clinical Psychiatry, 2008",
    url: "https://www.psychiatrist.com/jcp/randomized-controlled-trial-group-cognitive-behavioral/",
  },
  {
    id: "cooling-off",
    title: "Put time between “I want it” and “I bought it”",
    summary:
      "In a hot, emotional state people overestimate how much they'll want something later. A cooling-off period lets the urge fade before money moves. Pause-before-purchase apps report that most items placed on a waiting list end up skipped.",
    inKeel:
      "The Pause list holds any item for 24, 48 or 72 hours. When the timer ends you decide with a clear head — and skipped items count as real savings.",
    source: "Loewenstein, Health Psychology, 2005 (hot–cold empathy gaps)",
  },
  {
    id: "friction",
    title: "Change the environment, not just your willpower",
    summary:
      "Habits are triggered by context — the same drive home, the same time, the same app. Adding friction (a different route, deleted saved cards, unfollowed shopping accounts) and removing cues does more work than willpower in the moment.",
    inKeel:
      "Trigger tags and the time-of-day chart in Insights show your highest-risk contexts, so you know where to add friction first.",
    source: "Wood & Neal, Psychological Review, 2007",
  },
  {
    id: "replacement",
    title: "Replace the routine, keep the reward",
    summary:
      "A habit loop has a cue and a reward. Removing the behavior leaves the cue and the need behind. Pairing the old cue with a new routine that meets the same need — decompressing, a treat, a sense of ending the workday — makes the change sustainable.",
    inKeel:
      "Replacement habits sit on your Today screen next to the habits you're breaking, so the new routine gets checked off at the moment the old one used to happen.",
    source: "Habit reversal and competing-response training literature",
  },
  {
    id: "writing",
    title: "Writing it down helps",
    summary:
      "Expressive writing about difficult feelings has been linked to better mood and health outcomes across many studies. Putting a craving into words also creates distance from it — you become the observer instead of the urge.",
    inKeel:
      "The journal tracks mood, craving and how hard today felt, so “it's getting easier” becomes something you can see in a chart.",
    source: "Pennebaker, Psychological Science, 1997",
  },
];

export const SAFETY = {
  withdrawal:
    "If you drink heavily or every day, stopping suddenly can cause withdrawal that sometimes needs medical care. Talk to a doctor before you quit — they can help you taper or detox safely.",
  samhsa: { label: "SAMHSA National Helpline", phone: "1-800-662-4357", note: "Free, confidential, 24/7 treatment referral" },
  crisis: { label: "988 Suicide & Crisis Lifeline", phone: "988", note: "Call or text, 24/7" },
  rethinking: { label: "NIAAA Rethinking Drinking", url: "https://www.rethinkingdrinking.niaaa.nih.gov/" },
};

export const APPS_LANDSCAPE = [
  { name: "I Am Sober", focus: "Abstinence, day counter, daily pledges, community" },
  { name: "Reframe", focus: "Neuroscience course, cut back or quit, coaching" },
  { name: "Sunnyside", focus: "Moderation-first drink tracking and coaching" },
  { name: "Nomo", focus: "Simple multi-habit sobriety clocks" },
  { name: "CartPause / UnBuy / Waity", focus: "Cooling-off timers before purchases" },
  { name: "PauseBuy / Pass For Now", focus: "Pause screen when a shopping app opens" },
];
