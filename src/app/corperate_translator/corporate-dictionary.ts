export interface CorporatePhrase {
  phrase: string;
  variations?: string[];
  translations: string[];
  category: "meeting" | "email" | "management" | "hr" | "general" | "tech" | "consulting";
}

export const corporateDictionary: CorporatePhrase[] = [
  // ── Meeting jargon ──────────────────────────────────────
  {
    phrase: "let's circle back",
    variations: ["circle back", "circling back", "circled back"],
    translations: [
      "let's talk about this later (or never)",
      "I'm done thinking about this rn",
      "we're gonna pretend to revisit this but won't",
    ],
    category: "meeting",
  },
  {
    phrase: "let's take this offline",
    variations: ["take this offline", "taking this offline", "take it offline"],
    translations: [
      "this is getting awkward, let's argue privately",
      "I don't want witnesses for this conversation",
      "stop embarrassing yourself in front of everyone",
    ],
    category: "meeting",
  },
  {
    phrase: "let's align",
    variations: ["align on this", "aligned on", "get aligned", "alignment"],
    translations: [
      "let's all pretend to agree",
      "everyone shut up and do what I say",
      "let's have a meeting about having a meeting",
    ],
    category: "meeting",
  },
  {
    phrase: "deep dive",
    variations: ["deep-dive", "do a deep dive", "take a deep dive"],
    translations: [
      "actually look at this for once",
      "spend way too long on something simple",
      "overanalyze this until we're all dead inside",
    ],
    category: "meeting",
  },
  {
    phrase: "touch base",
    variations: ["touching base", "touched base", "let's touch base"],
    translations: [
      "hit you up",
      "bother you about this again",
      "pretend to care about your progress",
    ],
    category: "meeting",
  },
  {
    phrase: "hard stop",
    variations: ["have a hard stop", "i have a hard stop"],
    translations: [
      "I'm leaving this meeting whether you're done or not",
      "I literally cannot take any more of this",
      "my soul is leaving my body, I need to go",
    ],
    category: "meeting",
  },
  {
    phrase: "parking lot",
    variations: ["let's parking lot this", "parking lot that", "put it in the parking lot"],
    translations: [
      "we're never talking about this again",
      "that idea just died, rest in peace",
      "congratulations, your idea has been sent to the shadow realm",
    ],
    category: "meeting",
  },
  {
    phrase: "action items",
    variations: ["action item"],
    translations: [
      "stuff someone's gonna forget to do",
      "homework nobody asked for",
      "tasks that'll rot in someone's inbox",
    ],
    category: "meeting",
  },
  {
    phrase: "put a pin in it",
    variations: ["let's put a pin in it", "putting a pin in"],
    translations: [
      "we're burying this forever and you know it",
      "this idea is going to the graveyard",
      "your suggestion has been noted and will be ignored",
    ],
    category: "meeting",
  },
  {
    phrase: "bandwidth",
    variations: ["don't have the bandwidth", "limited bandwidth", "no bandwidth"],
    translations: [
      "I'm too busy (or just don't want to)",
      "absolutely not, I'm swamped",
      "my plate is full and I'm not sharing",
    ],
    category: "meeting",
  },
  {
    phrase: "synergy",
    variations: ["synergies", "synergize", "synergistic"],
    translations: [
      "literally just teamwork",
      "working together (revolutionary concept, I know)",
      "vibing together professionally or whatever",
    ],
    category: "meeting",
  },
  {
    phrase: "on the same page",
    variations: ["get on the same page", "getting on the same page"],
    translations: [
      "agree with me already",
      "stop having different opinions",
      "think what I think, please and thank you",
    ],
    category: "meeting",
  },
  {
    phrase: "boil the ocean",
    variations: ["boiling the ocean", "don't boil the ocean"],
    translations: [
      "doing way too much for no reason",
      "overcomplicating something that should be simple",
      "calm down, it's not that deep",
    ],
    category: "meeting",
  },
  {
    phrase: "blue-sky thinking",
    variations: ["blue sky thinking", "blue sky ideas"],
    translations: [
      "making stuff up with zero constraints",
      "fantasy brainstorming that'll never happen",
      "let's pretend money and reality don't exist",
    ],
    category: "meeting",
  },
  {
    phrase: "quick sync",
    variations: ["let's do a quick sync", "quick check-in", "quick huddle"],
    translations: [
      "a 45-minute meeting disguised as 5 minutes",
      "this will NOT be quick, bring snacks",
      "prepare to lose an hour of your life",
    ],
    category: "meeting",
  },
  {
    phrase: "level set",
    variations: ["level-set", "let's level set"],
    translations: [
      "let me explain this to you like you're five",
      "y'all are confused so let me fix that",
      "someone in this room is lost and it's showing",
    ],
    category: "meeting",
  },
  {
    phrase: "close the loop",
    variations: ["closing the loop", "closed the loop"],
    translations: [
      "finish this already, I'm begging",
      "can we PLEASE just be done with this",
      "wrap it up, this has been going on forever",
    ],
    category: "meeting",
  },
  {
    phrase: "unpack this",
    variations: ["let's unpack", "unpack that"],
    translations: [
      "explain this mess",
      "what does this even mean, please elaborate",
      "break it down because nobody understood that",
    ],
    category: "meeting",
  },
  {
    phrase: "table this",
    variations: ["let's table this", "tabling this"],
    translations: [
      "this conversation is dead, moving on",
      "we're done here, bye",
      "your idea has been yeeted into the void",
    ],
    category: "meeting",
  },
  {
    phrase: "30,000-foot view",
    variations: ["30000 foot view", "high-level view", "helicopter view"],
    translations: [
      "the vague overview nobody asked for",
      "zooming out so far the details don't matter",
      "let me explain this without actually explaining anything",
    ],
    category: "meeting",
  },
  {
    phrase: "open the kimono",
    variations: ["opening the kimono"],
    translations: [
      "overshare company secrets (and yes this phrase is weird)",
      "show you things you probably didn't need to see",
      "TMI incoming, brace yourself",
    ],
    category: "meeting",
  },
  {
    phrase: "double-click",
    variations: ["double click on this", "let's double-click"],
    translations: [
      "zoom in because someone wasn't paying attention",
      "let's overanalyze this one specific thing",
      "dig into the details that should've been clear already",
    ],
    category: "meeting",
  },
  {
    phrase: "drill down",
    variations: ["drilling down", "let's drill down"],
    translations: [
      "look at the boring details nobody wants to see",
      "time to stare at spreadsheets",
      "prepare for an uncomfortably detailed discussion",
    ],
    category: "meeting",
  },
  {
    phrase: "net net",
    variations: ["the net net is"],
    translations: [
      "basically",
      "TLDR",
      "the point is (since you can't figure it out)",
    ],
    category: "meeting",
  },
  {
    phrase: "take a step back",
    variations: ["let's take a step back", "stepping back"],
    translations: [
      "everyone's lost, let me start over",
      "this went off the rails, reset time",
      "y'all went too deep, come back to reality",
    ],
    category: "meeting",
  },

  // ── Email phrases ───────────────────────────────────────
  {
    phrase: "per my last email",
    variations: ["as per my last email", "as mentioned in my previous email"],
    translations: [
      "READ. MY. EMAIL. I already told you this",
      "I said this before and you clearly didn't read it",
      "check your inbox challenge (impossible)",
    ],
    category: "email",
  },
  {
    phrase: "hope this email finds you well",
    variations: ["hope this finds you well", "i hope you are doing well", "I hope this email finds you well"],
    translations: [
      "I don't actually care how you are, here's what I need",
      "mandatory pleasantry before I dump work on you",
      "skip this part, the real message is below",
    ],
    category: "email",
  },
  {
    phrase: "just following up",
    variations: ["following up on", "i'm just following up", "wanted to follow up"],
    translations: [
      "why haven't you answered me",
      "answer me. I'm waiting.",
      "this is my passive-aggressive nudge",
    ],
    category: "email",
  },
  {
    phrase: "thanks in advance",
    variations: ["thank you in advance"],
    translations: [
      "you literally have no choice, do it",
      "this isn't a request, it's a demand with a smiley face",
      "you're doing this whether you like it or not",
    ],
    category: "email",
  },
  {
    phrase: "please advise",
    variations: ["kindly advise", "please advise on"],
    translations: [
      "I have no idea what I'm doing, help",
      "tell me the answer because I'm stuck",
      "SOS, figure this out for me",
    ],
    category: "email",
  },
  {
    phrase: "at your earliest convenience",
    variations: ["at your convenience", "when you get a chance"],
    translations: [
      "do this NOW but I'm being fake polite about it",
      "ASAP but make it sound chill",
      "I needed this yesterday but I'll pretend I'm patient",
    ],
    category: "email",
  },
  {
    phrase: "looping you in",
    variations: ["loop you in", "looping in", "I'm looping you in"],
    translations: [
      "you're now part of this mess, congrats",
      "dragging you into drama that isn't yours",
      "surprise! you're involved now, good luck",
    ],
    category: "email",
  },
  {
    phrase: "for your reference",
    variations: ["for reference", "FYI", "for your information"],
    translations: [
      "read this or don't, I've done my part",
      "covering my butt by sending you this",
      "don't blame me later, I told you",
    ],
    category: "email",
  },
  {
    phrase: "for full visibility",
    variations: ["for visibility", "adding for visibility"],
    translations: [
      "everyone can see this now so nobody can play dumb",
      "making sure there's a paper trail",
      "you can't say you didn't know about this",
    ],
    category: "email",
  },
  {
    phrase: "just in case you missed this",
    variations: ["in case you missed this", "in case this was missed"],
    translations: [
      "you definitely saw this and ignored it",
      "we both know you ghosted me",
      "I know you read this and chose violence (silence)",
    ],
    category: "email",
  },
  {
    phrase: "with all due respect",
    variations: [],
    translations: [
      "I'm about to be disrespectful",
      "you're wrong and I'm about to explain why",
      "no disrespect but also full disrespect",
    ],
    category: "email",
  },
  {
    phrase: "as discussed",
    variations: ["as we discussed", "per our discussion", "as per our conversation"],
    translations: [
      "we talked about this, don't act brand new",
      "remember? we literally had this conversation",
      "in case you conveniently forgot what we agreed on",
    ],
    category: "email",
  },
  {
    phrase: "hope this helps",
    variations: [],
    translations: [
      "this is all you're getting from me, figure it out",
      "I did my part, leave me alone now",
      "good luck with that, I'm out",
    ],
    category: "email",
  },
  {
    phrase: "i may be wrong but",
    variations: ["I could be wrong but", "correct me if I'm wrong"],
    translations: [
      "I'm 100% right and we both know it",
      "I'm not wrong but I'll let you think you have a chance",
      "spoiler: I'm not wrong",
    ],
    category: "email",
  },
  {
    phrase: "quick question",
    variations: ["I have a quick question"],
    translations: [
      "this is NOT going to be quick",
      "prepare for a question that requires a thesis-length answer",
      "nothing about this is quick, buckle up",
    ],
    category: "email",
  },
  {
    phrase: "let me know your thoughts",
    variations: ["thoughts?", "what are your thoughts", "please share your thoughts"],
    translations: [
      "agree with me or explain yourself",
      "validate my idea or we're gonna have a problem",
      "tell me I'm right",
    ],
    category: "email",
  },
  {
    phrase: "going forward",
    variations: ["moving forward", "from now on"],
    translations: [
      "someone messed up so here's the new rule",
      "we're changing things because y'all can't be trusted",
      "new rule just dropped because of past failures",
    ],
    category: "email",
  },
  {
    phrase: "kindly note",
    variations: ["please note", "kindly be informed"],
    translations: [
      "pay attention because I'm only saying this once",
      "I'm being polite but I'm actually annoyed",
      "read this carefully or face the consequences",
    ],
    category: "email",
  },
  {
    phrase: "warm regards",
    variations: ["best regards", "kind regards"],
    translations: [
      "bye, I guess",
      "this email is over, stop reading",
      "corporate way of saying peace out",
    ],
    category: "email",
  },
  {
    phrase: "let me see what I can do",
    variations: [],
    translations: [
      "I'm not gonna do anything lol",
      "translation: no",
      "this is going straight to the bottom of my priority list",
    ],
    category: "email",
  },
  {
    phrase: "i trust this clarifies",
    variations: ["I hope this clarifies", "hope that clarifies"],
    translations: [
      "I'm done explaining, don't ask me again",
      "if you're still confused that's a you problem",
      "I've spelled it out, the rest is on you",
    ],
    category: "email",
  },
  {
    phrase: "thank you for your understanding",
    variations: ["thanks for understanding", "appreciate your understanding"],
    translations: [
      "you don't have a choice but to accept this",
      "deal with it",
      "this isn't up for debate, I'm just being polite",
    ],
    category: "email",
  },
  {
    phrase: "I wanted to flag",
    variations: ["flagging this", "just wanted to flag"],
    translations: [
      "something's wrong and I want it on record that I noticed",
      "heads up, this is gonna be a problem",
      "don't shoot the messenger but here's the tea",
    ],
    category: "email",
  },
  {
    phrase: "happy to discuss further",
    variations: ["happy to discuss", "feel free to reach out"],
    translations: [
      "please don't actually reach out",
      "I'm praying you don't have more questions",
      "I said what I said, but sure, 'discuss'",
    ],
    category: "email",
  },

  // ── Management speak ────────────────────────────────────
  {
    phrase: "move the needle",
    variations: ["moving the needle", "moves the needle"],
    translations: [
      "actually accomplish something for once",
      "make a difference that anyone can see",
      "do something that matters (novel concept)",
    ],
    category: "management",
  },
  {
    phrase: "low-hanging fruit",
    variations: ["low hanging fruit"],
    translations: [
      "the easy stuff we should've done ages ago",
      "lazy wins",
      "the minimum effort tasks we're calling strategy",
    ],
    category: "management",
  },
  {
    phrase: "leverage",
    variations: ["leveraging", "leveraged"],
    translations: [
      "use (just say use)",
      "exploit something to our advantage",
      "squeeze every last drop out of this",
    ],
    category: "management",
  },
  {
    phrase: "pivot",
    variations: ["pivoting", "pivoted"],
    translations: [
      "our original plan failed so we're doing something else",
      "plot twist, we're changing everything",
      "panic-switching directions and calling it strategy",
    ],
    category: "management",
  },
  {
    phrase: "north star",
    variations: ["north star metric", "our north star"],
    translations: [
      "the one thing we actually care about",
      "the goal we'll obsess over while ignoring everything else",
      "our main vibe, basically",
    ],
    category: "management",
  },
  {
    phrase: "thought leadership",
    variations: ["thought leader"],
    translations: [
      "having opinions and a LinkedIn account",
      "saying obvious stuff but making it sound profound",
      "professional yapping",
    ],
    category: "management",
  },
  {
    phrase: "value-add",
    variations: ["value add", "added value"],
    translations: [
      "something actually useful (rare in meetings)",
      "the thing that makes this not a complete waste of time",
      "proof you're not dead weight",
    ],
    category: "management",
  },
  {
    phrase: "stakeholder",
    variations: ["stakeholders", "key stakeholders"],
    translations: [
      "people who have opinions and won't shut up about them",
      "everyone who gets to say no to your idea",
      "the people you have to keep happy or you're toast",
    ],
    category: "management",
  },
  {
    phrase: "circle of influence",
    variations: [],
    translations: [
      "the people you need to schmooze",
      "your corporate friend group",
      "the people who actually decide things around here",
    ],
    category: "management",
  },
  {
    phrase: "empower",
    variations: ["empowered", "empowering", "empowerment"],
    translations: [
      "give you more work but make it sound inspiring",
      "you're on your own now, good luck",
      "here's responsibility without a raise",
    ],
    category: "management",
  },
  {
    phrase: "rightsizing",
    variations: ["rightsize", "rightsized"],
    translations: [
      "mass layoffs but make it sound strategic",
      "people are getting fired, period",
      "corporate speak for 'you might lose your job'",
    ],
    category: "management",
  },
  {
    phrase: "downsizing",
    variations: ["downsize", "downsized"],
    translations: [
      "layoffs. just say layoffs.",
      "people are losing their jobs",
      "the company is shrinking and pretending it's a good thing",
    ],
    category: "management",
  },
  {
    phrase: "restructuring",
    variations: ["restructure", "organizational restructuring"],
    translations: [
      "musical chairs but with people's livelihoods",
      "everything's changing and nobody's safe",
      "chaos rebranded as strategy",
    ],
    category: "management",
  },
  {
    phrase: "cross-functional",
    variations: ["cross functional", "cross-functional team"],
    translations: [
      "people from different teams forced to work together",
      "a group project but make it corporate",
      "too many cooks in the kitchen, professionally",
    ],
    category: "management",
  },
  {
    phrase: "run it up the flagpole",
    variations: ["running it up the flagpole"],
    translations: [
      "ask the boss and pray they don't hate it",
      "let someone more important decide",
      "throw the idea out there and see who roasts it",
    ],
    category: "management",
  },
  {
    phrase: "move the goalposts",
    variations: ["moving the goalposts"],
    translations: [
      "change the rules mid-game because they're losing",
      "the target keeps changing and it's not fair",
      "they keep changing what 'success' means",
    ],
    category: "management",
  },
  {
    phrase: "best practices",
    variations: ["best practice", "industry best practices"],
    translations: [
      "the way everyone does it (doesn't mean it's good)",
      "copy what other companies do and call it smart",
      "stuff that sounds right but nobody actually follows",
    ],
    category: "management",
  },
  {
    phrase: "deliverables",
    variations: ["deliverable", "key deliverables"],
    translations: [
      "the stuff you gotta hand in",
      "your homework, basically",
      "things people are waiting for you to finish",
    ],
    category: "management",
  },
  {
    phrase: "ROI",
    variations: ["return on investment"],
    translations: [
      "did we make money or nah?",
      "was this worth it? (probably not)",
      "the math that decides if your project lives or dies",
    ],
    category: "management",
  },
  {
    phrase: "KPI",
    variations: ["KPIs", "key performance indicator", "key performance indicators"],
    translations: [
      "the numbers your boss stares at",
      "metrics that decide if you get a raise or a talk",
      "the scoreboard of corporate survival",
    ],
    category: "management",
  },
  {
    phrase: "pipeline",
    variations: ["in the pipeline", "sales pipeline"],
    translations: [
      "stuff that might happen but probably won't",
      "a fancy word for our to-do list",
      "future revenue we're manifesting into existence",
    ],
    category: "management",
  },
  {
    phrase: "circle of trust",
    variations: [],
    translations: [
      "the people who know the secret (you're not in it)",
      "inner circle vibes",
      "the cool kids table but at work",
    ],
    category: "management",
  },
  {
    phrase: "skin in the game",
    variations: ["have skin in the game"],
    translations: [
      "you better care because your butt's on the line",
      "this affects you personally so pay attention",
      "you're invested whether you like it or not",
    ],
    category: "management",
  },
  {
    phrase: "swim lane",
    variations: ["swim lanes", "stay in your swim lane"],
    translations: [
      "stay in your lane, this isn't your business",
      "do YOUR job and stop worrying about mine",
      "mind your own department",
    ],
    category: "management",
  },
  {
    phrase: "bleeding edge",
    variations: ["cutting edge", "cutting-edge"],
    translations: [
      "so new it'll probably break",
      "untested tech we're gambling on",
      "fancy and fragile",
    ],
    category: "management",
  },

  // ── HR / Corporate culture ──────────────────────────────
  {
    phrase: "culture fit",
    variations: ["not a culture fit"],
    translations: [
      "we only hire people exactly like us",
      "you didn't vibe with the interviewer's energy",
      "you're qualified but we don't like your vibe",
    ],
    category: "hr",
  },
  {
    phrase: "wear many hats",
    variations: ["wearing many hats"],
    translations: [
      "do five people's jobs for one person's salary",
      "we're understaffed and calling it 'versatility'",
      "you're everything: developer, designer, therapist, janitor",
    ],
    category: "hr",
  },
  {
    phrase: "fast-paced environment",
    variations: ["fast paced environment"],
    translations: [
      "it's chaos and we're always behind",
      "burnout speedrun",
      "we never have enough people to do the work",
    ],
    category: "hr",
  },
  {
    phrase: "self-starter",
    variations: ["self starter"],
    translations: [
      "nobody will train you, figure it out",
      "you're on your own from day one",
      "we don't have onboarding, good luck bestie",
    ],
    category: "hr",
  },
  {
    phrase: "growth mindset",
    variations: [],
    translations: [
      "accept failure as a 'learning opportunity' and don't complain",
      "be positive about everything even when it sucks",
      "toxic positivity but make it professional development",
    ],
    category: "hr",
  },
  {
    phrase: "open-door policy",
    variations: ["open door policy", "my door is always open"],
    translations: [
      "the door is open but they'll judge you for walking through it",
      "you CAN talk to me (but please don't)",
      "technically accessible, emotionally unavailable",
    ],
    category: "hr",
  },
  {
    phrase: "work-life balance",
    variations: ["work life balance"],
    translations: [
      "a myth they mention during interviews",
      "what they promise but never deliver",
      "the lie that keeps us applying",
    ],
    category: "hr",
  },
  {
    phrase: "competitive salary",
    variations: ["competitive compensation"],
    translations: [
      "we googled the market rate and went lower",
      "competing to pay you the least possible",
      "we'll lowball you and call it competitive",
    ],
    category: "hr",
  },
  {
    phrase: "unlimited PTO",
    variations: ["unlimited vacation", "unlimited time off"],
    translations: [
      "take zero days off because of guilt and peer pressure",
      "technically unlimited but actually you'll take less than before",
      "a trap disguised as a benefit",
    ],
    category: "hr",
  },
  {
    phrase: "we're like a family",
    variations: ["we're a family here", "family environment", "like a family"],
    translations: [
      "dysfunctional with no boundaries",
      "we'll guilt trip you into working overtime",
      "the biggest red flag in any job posting",
    ],
    category: "hr",
  },
  {
    phrase: "performance improvement plan",
    variations: ["PIP", "performance plan"],
    translations: [
      "you're getting fired in 30-90 days, start job hunting",
      "the corporate pre-firing ritual",
      "your official countdown to unemployment",
    ],
    category: "hr",
  },
  {
    phrase: "team player",
    variations: ["not a team player", "be a team player"],
    translations: [
      "do extra work without complaining",
      "say yes to everything and never push back",
      "sacrifice your boundaries for the team",
    ],
    category: "hr",
  },
  {
    phrase: "professional development",
    variations: ["growth opportunities"],
    translations: [
      "here's a free webinar instead of a raise",
      "we'll train you but won't pay you more",
      "learn new skills so you can leave for a better job",
    ],
    category: "hr",
  },
  {
    phrase: "town hall",
    variations: ["all-hands", "all hands meeting", "company all-hands"],
    translations: [
      "a meeting where leadership talks and you listen",
      "corporate propaganda hour",
      "the meeting that could've been an email to end all emails",
    ],
    category: "hr",
  },
  {
    phrase: "constructive feedback",
    variations: ["constructive criticism"],
    translations: [
      "you messed up and here's a polite way to say it",
      "criticism in a nice wrapper",
      "they're roasting you professionally",
    ],
    category: "hr",
  },
  {
    phrase: "let's discuss your career trajectory",
    variations: ["career trajectory", "career path", "career growth"],
    translations: [
      "there's no promotion coming, just so you know",
      "we'll talk about your future but change nothing",
      "hope you like where you are because that's where you're staying",
    ],
    category: "hr",
  },
  {
    phrase: "360 review",
    variations: ["360 feedback", "360-degree review"],
    translations: [
      "everyone gets to judge you anonymously",
      "find out what your coworkers really think of you",
      "corporate roast session but with forms",
    ],
    category: "hr",
  },

  // ── General corporate BS ────────────────────────────────
  {
    phrase: "at the end of the day",
    variations: [],
    translations: [
      "basically",
      "when all is said and done (just say 'basically')",
      "the point is",
    ],
    category: "general",
  },
  {
    phrase: "it is what it is",
    variations: [],
    translations: [
      "I've given up and so should you",
      "nothing we can do, just vibes now",
      "acceptance achieved, moving on",
    ],
    category: "general",
  },
  {
    phrase: "think outside the box",
    variations: ["thinking outside the box"],
    translations: [
      "be creative (but not too creative, we have a budget)",
      "come up with something different but also safe",
      "have ideas but only ones management will approve",
    ],
    category: "general",
  },
  {
    phrase: "paradigm shift",
    variations: ["paradigm-shifting"],
    translations: [
      "everything you knew is wrong now",
      "a fancy way to say 'big change'",
      "dramatic plot twist in how we do things",
    ],
    category: "general",
  },
  {
    phrase: "game changer",
    variations: ["game-changer", "game changing"],
    translations: [
      "it's not actually that revolutionary but okay",
      "slightly better than before, honestly",
      "mildly impactful at best",
    ],
    category: "general",
  },
  {
    phrase: "scalable",
    variations: ["scalable solution", "scalability"],
    translations: [
      "it'll work if we somehow get bigger",
      "future-proof (narrator: it was not future-proof)",
      "can handle more stuff theoretically",
    ],
    category: "general",
  },
  {
    phrase: "robust",
    variations: ["robust solution", "robust framework"],
    translations: [
      "strong? sturdy? just say strong.",
      "we built it good (allegedly)",
      "it works and we're weirdly proud about it",
    ],
    category: "general",
  },
  {
    phrase: "optimize",
    variations: ["optimizing", "optimized", "optimization"],
    translations: [
      "make it less terrible",
      "fix the thing that should've worked in the first place",
      "improve it (groundbreaking, I know)",
    ],
    category: "general",
  },
  {
    phrase: "streamline",
    variations: ["streamlining", "streamlined"],
    translations: [
      "make it less annoying to deal with",
      "remove the unnecessary stuff we added in the first place",
      "simplify (who would've thought)",
    ],
    category: "general",
  },
  {
    phrase: "utilize",
    variations: ["utilizing"],
    translations: [
      "USE. the word is USE.",
      "just say 'use' challenge: impossible",
      "'use' but make it fancy for no reason",
    ],
    category: "general",
  },
  {
    phrase: "incentivize",
    variations: ["incentivized", "incentivizing"],
    translations: [
      "bribe people to work harder",
      "dangle a carrot and hope for the best",
      "motivate through rewards (or threats)",
    ],
    category: "general",
  },
  {
    phrase: "reach out",
    variations: ["reaching out", "reached out"],
    translations: [
      "slide into their DMs",
      "hit them up",
      "text/email/bother someone",
    ],
    category: "general",
  },
  {
    phrase: "ping me",
    variations: ["ping you", "I'll ping you", "send me a ping"],
    translations: [
      "text me",
      "message me (just say message me)",
      "hit me up on Slack or whatever",
    ],
    category: "general",
  },
  {
    phrase: "EOD",
    variations: ["end of day", "by EOD", "by end of day"],
    translations: [
      "before you leave today (no pressure lol)",
      "today. they mean today.",
      "the clock is ticking bestie",
    ],
    category: "general",
  },
  {
    phrase: "ASAP",
    variations: ["as soon as possible"],
    translations: [
      "RIGHT NOW",
      "yesterday would've been ideal",
      "drop everything and do this",
    ],
    category: "general",
  },
  {
    phrase: "give 110%",
    variations: ["110%", "give it 110 percent", "110 percent"],
    translations: [
      "burn yourself out for the company",
      "work more than humanly possible",
      "sacrifice your wellbeing for a paycheck",
    ],
    category: "general",
  },
  {
    phrase: "lean in",
    variations: ["leaning in"],
    translations: [
      "try harder (but like, inspirationally)",
      "push yourself beyond your limits and call it empowerment",
      "work more, complain less",
    ],
    category: "general",
  },
  {
    phrase: "mission critical",
    variations: ["mission-critical"],
    translations: [
      "if this fails we're all toast",
      "this actually matters (for once)",
      "no pressure but EVERYTHING depends on this",
    ],
    category: "general",
  },
  {
    phrase: "on my radar",
    variations: ["on our radar", "it's on my radar"],
    translations: [
      "I know about it but I'm not doing anything yet",
      "I'm aware and choosing to ignore it for now",
      "acknowledged, filed under 'later'",
    ],
    category: "general",
  },
  {
    phrase: "ecosystem",
    variations: [],
    translations: [
      "the confusing web of things connected to other things",
      "it's complicated and we like it that way",
      "a bunch of stuff that works together (supposedly)",
    ],
    category: "general",
  },
  {
    phrase: "optics",
    variations: ["the optics", "bad optics"],
    translations: [
      "how it looks to other people (who we're trying to impress)",
      "we care more about perception than reality",
      "what will people think? (that's all that matters)",
    ],
    category: "general",
  },
  {
    phrase: "take ownership",
    variations: ["take full ownership", "own this"],
    translations: [
      "it's your problem now, don't come crying to me",
      "you're responsible and if it fails it's on you",
      "here's the blame, I mean responsibility",
    ],
    category: "general",
  },
  {
    phrase: "bottom line",
    variations: ["the bottom line"],
    translations: [
      "the money part (the only part they actually care about)",
      "how much cash are we making",
      "cut the fluff, what's the profit",
    ],
    category: "general",
  },
  {
    phrase: "back burner",
    variations: ["on the back burner", "put it on the back burner"],
    translations: [
      "we're never doing this lmao",
      "forgotten about until someone panics",
      "low priority = no priority",
    ],
    category: "general",
  },
  {
    phrase: "hit the ground running",
    variations: ["hitting the ground running"],
    translations: [
      "start working immediately, no training, no mercy",
      "no time to learn, just figure it out",
      "sink or swim energy",
    ],
    category: "general",
  },
  {
    phrase: "let's not reinvent the wheel",
    variations: ["reinvent the wheel", "reinventing the wheel"],
    translations: [
      "just copy what already works",
      "don't overcomplicate it, we literally have a template",
      "someone already did this, just steal their approach",
    ],
    category: "general",
  },
  {
    phrase: "win-win",
    variations: ["win-win situation", "win win"],
    translations: [
      "everyone pretends to be happy",
      "compromise but make it sound positive",
      "nobody got what they wanted but we're calling it a win",
    ],
    category: "general",
  },
  {
    phrase: "ducks in a row",
    variations: ["get our ducks in a row", "get your ducks in a row"],
    translations: [
      "get organized because right now it's a mess",
      "sort your life out before the meeting",
      "fix the chaos before someone important notices",
    ],
    category: "general",
  },
  {
    phrase: "move the goalpost",
    variations: ["moving the goalpost", "moved the goalpost"],
    translations: [
      "changed the rules because they were losing",
      "the target keeps shifting and it's not fair",
      "corporate gaslighting about what 'done' means",
    ],
    category: "general",
  },

  // ── Tech corporate ──────────────────────────────────────
  {
    phrase: "agile",
    variations: ["agile methodology", "agile framework"],
    translations: [
      "organized chaos with sticky notes",
      "pretending 2-week sprints solve everything",
      "meetings about meetings about when to code",
    ],
    category: "tech",
  },
  {
    phrase: "sprint",
    variations: ["this sprint", "next sprint", "sprint planning"],
    translations: [
      "2 weeks of cramming 4 weeks of work",
      "the time period we pretend is enough",
      "a marathon disguised as a sprint (ironic)",
    ],
    category: "tech",
  },
  {
    phrase: "disrupt",
    variations: ["disrupting", "disruption", "disruptive"],
    translations: [
      "do what everyone else does but with an app",
      "break an industry and call it innovation",
      "make things worse before they get better (maybe)",
    ],
    category: "tech",
  },
  {
    phrase: "iterate",
    variations: ["iterating", "iteration"],
    translations: [
      "try again because the first version sucked",
      "keep tweaking until someone says stop",
      "version 47 of the same thing",
    ],
    category: "tech",
  },
  {
    phrase: "MVP",
    variations: ["minimum viable product"],
    translations: [
      "the bare minimum we can ship without total embarrassment",
      "it barely works but here you go",
      "version 0.1 that we're charging full price for",
    ],
    category: "tech",
  },
  {
    phrase: "digital transformation",
    variations: [],
    translations: [
      "we finally stopped using fax machines",
      "putting things on computers (revolutionary)",
      "spending millions to do what a spreadsheet could do",
    ],
    category: "tech",
  },
  {
    phrase: "data-driven",
    variations: ["data driven"],
    translations: [
      "we looked at a graph once",
      "making decisions based on numbers (when they support our opinion)",
      "cherry-picking stats to justify what we already decided",
    ],
    category: "tech",
  },
  {
    phrase: "AI-powered",
    variations: ["AI powered", "powered by AI", "uses AI"],
    translations: [
      "we added ChatGPT and called it innovation",
      "there's an if-else statement somewhere in there",
      "slapped 'AI' on it to sound fancy",
    ],
    category: "tech",
  },
  {
    phrase: "tech stack",
    variations: [],
    translations: [
      "the pile of tools we chose and now regret",
      "all the software duct-taped together",
      "our collection of technologies (half are outdated)",
    ],
    category: "tech",
  },
  {
    phrase: "growth hacking",
    variations: ["growth hack"],
    translations: [
      "trying random stuff and praying it works",
      "marketing but make it sound like engineering",
      "throwing spaghetti at the wall, professionally",
    ],
    category: "tech",
  },
  {
    phrase: "blockchain",
    variations: ["web3", "decentralized"],
    translations: [
      "a database but expensive and confusing",
      "crypto stuff that nobody fully understands",
      "the technology that's always 'the future' but never the present",
    ],
    category: "tech",
  },
  {
    phrase: "ideate",
    variations: ["ideation", "ideating"],
    translations: [
      "brainstorm (just say brainstorm)",
      "think of ideas (why do we need a fancy word for this)",
      "make stuff up and write it on a whiteboard",
    ],
    category: "tech",
  },
  {
    phrase: "silo",
    variations: ["silos", "working in silos", "siloed"],
    translations: [
      "teams that don't talk to each other",
      "everyone doing their own thing and hoping it works out",
      "organizational dysfunction with a fancy name",
    ],
    category: "tech",
  },
  {
    phrase: "stand-up",
    variations: ["standup", "daily standup", "daily stand-up"],
    translations: [
      "a meeting where everyone says 'same as yesterday'",
      "15 minutes that always becomes 45",
      "the meeting that makes you question your career choices",
    ],
    category: "tech",
  },
  {
    phrase: "retro",
    variations: ["retrospective", "sprint retro"],
    translations: [
      "group therapy but for your sprint",
      "complaining about what went wrong (again)",
      "we'll identify problems and solve none of them",
    ],
    category: "tech",
  },

  // ── Real corporate email language ─────────────────────────
  {
    phrase: "in light of",
    variations: ["in light of the feedback", "in light of recent"],
    translations: [
      "because of",
      "since y'all complained",
      "because something happened and now we have to react",
    ],
    category: "email",
  },
  {
    phrase: "further clarification",
    variations: ["provide clarification", "provide some clarification", "some further clarification", "for clarification"],
    translations: [
      "let me explain this again since nobody got it the first time",
      "the last email was confusing so here's attempt #2",
      "we messed up the communication so here's a redo",
    ],
    category: "email",
  },
  {
    phrase: "as a reminder",
    variations: ["just a reminder", "a friendly reminder", "gentle reminder", "a quick reminder"],
    translations: [
      "I already told you this and you clearly forgot",
      "read. the. previous. email.",
      "passive-aggressively repeating myself",
    ],
    category: "email",
  },
  {
    phrase: "we recognise that",
    variations: ["we recognize that", "we recognise", "we recognize", "we understand that"],
    translations: [
      "we know you're mad",
      "we heard the complaints loud and clear",
      "yes we saw the angry Slack messages",
    ],
    category: "email",
  },
  {
    phrase: "we appreciate",
    variations: ["we truly appreciate", "we really appreciate", "thank you to everyone who"],
    translations: [
      "thanks for not rioting (yet)",
      "we appreciate the vibes even though nothing's changing",
      "we value your complaints, truly (not really)",
    ],
    category: "email",
  },
  {
    phrase: "constructive dialogue",
    variations: ["open and constructive dialogue", "open dialogue", "constructive discussions", "productive dialogue", "productive discussions"],
    translations: [
      "people yelling at us but politely",
      "the professional version of a heated group chat",
      "everyone complaining in a civil manner",
    ],
    category: "email",
  },
  {
    phrase: "share their perspectives",
    variations: ["share your perspectives", "share your feedback", "shared their perspectives", "share their feedback"],
    translations: [
      "complained (and we heard you)",
      "told us exactly how they feel about this mess",
      "expressed their displeasure in corporate-safe language",
    ],
    category: "email",
  },
  {
    phrase: "created some uncertainty",
    variations: ["caused some confusion", "led to some confusion", "caused some uncertainty"],
    translations: [
      "confused the heck out of everyone",
      "nobody knew what was going on",
      "was unclear and people are stressed",
    ],
    category: "email",
  },
  {
    phrase: "greater consistency",
    variations: ["more consistency", "ensure consistency", "maintain consistency", "consistent approach"],
    translations: [
      "making sure everyone follows the same rules (finally)",
      "stop doing your own thing",
      "one rule for everyone, no more special treatment",
    ],
    category: "general",
  },
  {
    phrase: "introduce more flexibility",
    variations: ["greater flexibility", "more flexibility", "added flexibility", "additional flexibility"],
    translations: [
      "we loosened the rules slightly and want credit for it",
      "a tiny improvement we're presenting as revolutionary",
      "marginally less rigid than before, you're welcome",
    ],
    category: "hr",
  },
  {
    phrase: "balance individual flexibility with",
    variations: ["balance flexibility with", "balance the needs of"],
    translations: [
      "give you just enough freedom to stop complaining but not enough to actually matter",
      "corporate compromise: everyone's equally unhappy",
      "we tried to please everyone and pleased no one",
    ],
    category: "hr",
  },
  {
    phrase: "we value",
    variations: ["we value your", "we truly value"],
    translations: [
      "we claim to care about",
      "standard corporate appreciation that means nothing",
      "we appreciate this in theory, not in budget",
    ],
    category: "email",
  },
  {
    phrase: "your partnership",
    variations: ["our partnership", "partnership in", "collaborative partnership"],
    translations: [
      "your compliance (but dressed up nicely)",
      "you going along with what we decided",
      "thanks for not making this harder than it needs to be",
    ],
    category: "email",
  },
  {
    phrase: "workable in practice",
    variations: ["workable for everyone", "workable solution"],
    translations: [
      "something that actually works IRL and not just on paper",
      "functional outside of PowerPoint slides",
      "not just theoretical corporate fantasy",
    ],
    category: "general",
  },
  {
    phrase: "thoughtful feedback",
    variations: ["valuable feedback", "helpful feedback"],
    translations: [
      "the complaints we actually read",
      "the feedback that wasn't straight-up rude",
      "criticism that was polite enough to acknowledge",
    ],
    category: "email",
  },
  {
    phrase: "your engagement",
    variations: ["thank you for your engagement", "appreciate your engagement"],
    translations: [
      "thanks for actually reading the email and responding",
      "grateful you cared enough to hit reply",
      "we noticed you paid attention, impressive",
    ],
    category: "email",
  },
  {
    phrase: "updated to reflect",
    variations: ["has been updated to reflect", "been updated to reflect"],
    translations: [
      "we changed it because people pointed out problems",
      "fixed after complaints",
      "quietly revised after the backlash",
    ],
    category: "email",
  },
  {
    phrase: "resource planning",
    variations: ["resource allocation", "resource management"],
    translations: [
      "figuring out who does what with not enough people",
      "spreadsheet Tetris with humans",
      "pretending we have enough staff for all this work",
    ],
    category: "management",
  },
  {
    phrase: "align with business",
    variations: ["aligned with business", "aligns with business", "align with our business"],
    translations: [
      "match what the company actually cares about (money)",
      "fit the corporate agenda",
      "do what the business wants, personal preferences aside",
    ],
    category: "management",
  },
  {
    phrase: "do not hesitate to",
    variations: ["don't hesitate to", "please do not hesitate", "please don't hesitate"],
    translations: [
      "please actually hesitate, I'm busy",
      "this is an invitation you're not supposed to accept",
      "feel free to reach out (but please don't)",
    ],
    category: "email",
  },
  {
    phrase: "should you have any questions",
    variations: ["if you have any questions", "if you have any questions or concerns", "should you have any concerns"],
    translations: [
      "please don't have questions",
      "we hope this is clear enough that nobody bothers us",
      "if you're confused, re-read it before asking",
    ],
    category: "email",
  },
  {
    phrase: "we remain committed",
    variations: ["we are committed to", "remain committed to", "our commitment to", "committed to"],
    translations: [
      "we'll keep saying this without actually changing anything",
      "corporate promise that costs nothing to make",
      "we'll pretend to care about this indefinitely",
    ],
    category: "general",
  },
  {
    phrase: "effective immediately",
    variations: ["with immediate effect", "effective as of"],
    translations: [
      "this is happening NOW, no discussion",
      "surprise! new rules, no time to prepare",
      "already in effect before you finished reading this email",
    ],
    category: "hr",
  },
  {
    phrase: "in an effort to",
    variations: ["in our effort to", "in efforts to"],
    translations: [
      "we're trying to",
      "our attempt at",
      "because we need to look like we're doing something",
    ],
    category: "email",
  },
  {
    phrase: "at this time",
    variations: ["at this point in time", "at this juncture", "at this stage"],
    translations: [
      "right now (why do you need 4 words for 'now')",
      "currently (in corporate-speak that takes 4x longer to say)",
      "for now, but we reserve the right to change our minds",
    ],
    category: "general",
  },
  {
    phrase: "in due course",
    variations: ["in the near future", "in the coming weeks"],
    translations: [
      "eventually... maybe... who knows when",
      "at some undefined future date (don't hold your breath)",
      "when we get around to it, no promises",
    ],
    category: "general",
  },
  {
    phrase: "rest assured",
    variations: ["you can rest assured", "please rest assured"],
    translations: [
      "don't panic (you should probably panic)",
      "we're saying this because you have every reason to worry",
      "trust us bro (ominous)",
    ],
    category: "email",
  },
  {
    phrase: "after careful consideration",
    variations: ["upon careful review", "after thorough review", "after due consideration"],
    translations: [
      "we talked about it for 5 minutes in a meeting",
      "we already decided but want it to sound thoughtful",
      "the decision was made ages ago, we just delayed telling you",
    ],
    category: "management",
  },
  {
    phrase: "we are pleased to announce",
    variations: ["pleased to announce", "pleased to inform you", "we are happy to announce", "happy to share"],
    translations: [
      "here comes something we think is good news (you might disagree)",
      "PR team approved this phrasing",
      "management wants credit for this one",
    ],
    category: "email",
  },
  {
    phrase: "in a timely manner",
    variations: ["in a timely fashion"],
    translations: [
      "hurry up",
      "do it fast but we're being polite about it",
      "ASAP but make it sound less aggressive",
    ],
    category: "general",
  },
  {
    phrase: "with respect to",
    variations: ["with regard to", "with regards to", "in regard to", "in regards to", "regarding"],
    translations: [
      "about (just say 'about')",
      "concerning (still too many syllables, just say 'about')",
      "on the topic of (why use 5 words when 1 works)",
    ],
    category: "email",
  },
  {
    phrase: "to that end",
    variations: ["with that in mind", "to this end"],
    translations: [
      "so basically",
      "here's what we're doing about it",
      "anyway, here's the actual point",
    ],
    category: "email",
  },
  {
    phrase: "in the interest of transparency",
    variations: ["for the sake of transparency", "in the spirit of transparency", "to be transparent"],
    translations: [
      "we're telling you this because we legally have to",
      "here's the info we'd rather not share",
      "transparency unlocked (for once)",
    ],
    category: "management",
  },
  {
    phrase: "ensure compliance",
    variations: ["in compliance with", "ensure adherence", "adhere to"],
    translations: [
      "follow the rules or else",
      "do this or legal will be very unhappy",
      "this isn't optional, despite the polite wording",
    ],
    category: "hr",
  },
  {
    phrase: "take into consideration",
    variations: ["take into account", "taken into consideration", "taken into account"],
    translations: [
      "think about (but simpler)",
      "factor this in when making decisions",
      "don't ignore this even though you want to",
    ],
    category: "general",
  },
  {
    phrase: "due diligence",
    variations: ["conduct due diligence", "proper due diligence"],
    translations: [
      "actually check if this is legit before committing",
      "do your homework",
      "the research you should've done before saying yes",
    ],
    category: "management",
  },
  {
    phrase: "transition period",
    variations: ["going through a transition", "period of transition", "during this transition"],
    translations: [
      "everything is chaos right now but temporarily (we hope)",
      "buckle up, things are changing and nobody knows what's happening",
      "the awkward in-between phase where nothing works properly",
    ],
    category: "hr",
  },
  {
    phrase: "in practice",
    variations: [],
    translations: [
      "in real life, not just corporate fantasy land",
      "how it actually works vs the policy doc",
      "the reality check version",
    ],
    category: "general",
  },
  {
    phrase: "that said",
    variations: ["that being said", "having said that"],
    translations: [
      "BUT (here comes the real message)",
      "forget everything nice I just said, here's the catch",
      "plot twist incoming",
    ],
    category: "email",
  },
  {
    phrase: "on behalf of",
    variations: ["on behalf of the team", "on behalf of the leadership"],
    translations: [
      "someone more important told me to say this",
      "I'm the messenger, don't shoot",
      "this isn't my idea but I'm delivering it anyway",
    ],
    category: "email",
  },
  {
    phrase: "would like to clarify",
    variations: ["wanted to clarify", "would like to provide clarity", "want to be clear"],
    translations: [
      "the last communication was a mess, let's try again",
      "people misunderstood (or we explained it badly)",
      "clarification round 2 because round 1 failed",
    ],
    category: "email",
  },
  {
    phrase: "take the necessary steps",
    variations: ["taking the necessary steps", "taken the necessary steps"],
    translations: [
      "do what needs to be done (vague on purpose)",
      "handle it, we trust you (not really)",
      "figure it out and don't bother us with the details",
    ],
    category: "management",
  },
  {
    phrase: "we would also like to",
    variations: ["we would like to", "we'd like to", "we'd also like to"],
    translations: [
      "oh and one more thing (there's always one more thing)",
      "bonus corporate content incoming",
      "we're not done yet, buckle up",
    ],
    category: "email",
  },
  {
    phrase: "subject to approval",
    variations: ["subject to review", "pending approval", "awaiting approval"],
    translations: [
      "someone more important has to say yes first",
      "maybe, if the boss is in a good mood",
      "don't get excited yet, this could still be denied",
    ],
    category: "management",
  },
  {
    phrase: "validated by",
    variations: ["validated", "needs to be validated"],
    translations: [
      "approved by the people who actually matter",
      "stamped by the gatekeepers",
      "the people upstairs need to sign off first",
    ],
    category: "management",
  },
  {
    phrase: "to support",
    variations: ["in order to support", "designed to support"],
    translations: [
      "to help (5 syllables shorter)",
      "so that this thing actually works",
      "an attempt to make things better",
    ],
    category: "general",
  },
  {
    phrase: "to foster",
    variations: ["fostering", "fostered"],
    translations: [
      "to encourage (but make it corporate)",
      "to grow something through sheer corporate willpower",
      "cultivating vibes, professionally",
    ],
    category: "general",
  },
  {
    phrase: "to facilitate",
    variations: ["facilitating", "facilitated"],
    translations: [
      "to make happen (just say that)",
      "to organize something that should've organized itself",
      "corporate speak for 'helping'",
    ],
    category: "general",
  },
  {
    phrase: "accordingly",
    variations: [],
    translations: [
      "so act right",
      "adjust your behavior based on what we just said",
      "you've been informed, now deal with it",
    ],
    category: "general",
  },
  {
    phrase: "consistent with",
    variations: ["in line with", "in alignment with"],
    translations: [
      "matching what we said before (for once)",
      "same energy as the previous rule",
      "keeping it consistent so nobody can complain",
    ],
    category: "general",
  },
  {
    phrase: "for the avoidance of doubt",
    variations: ["to avoid any confusion", "to avoid any doubt"],
    translations: [
      "since y'all can't read between the lines, here it is spelled out",
      "we know someone will misunderstand this so here's the ELI5",
      "let me be painfully clear since subtlety failed",
    ],
    category: "email",
  },
  {
    phrase: "upon review",
    variations: ["after review", "following review", "following a review"],
    translations: [
      "we looked at it",
      "someone actually read the document (shocking)",
      "after someone finally checked the work",
    ],
    category: "management",
  },
  {
    phrase: "deemed necessary",
    variations: ["deemed appropriate", "as deemed necessary"],
    translations: [
      "someone decided this needs to happen",
      "the higher-ups said so",
      "judged to be needed by people with bigger titles",
    ],
    category: "management",
  },
  {
    phrase: "we encourage",
    variations: ["we encourage you to", "you are encouraged to"],
    translations: [
      "we're strongly suggesting but pretending it's optional",
      "do this or face silent judgment",
      "this is basically mandatory but we're being nice about it",
    ],
    category: "hr",
  },
  {
    phrase: "looking into this",
    variations: ["looking into it", "we are looking into", "we're looking into"],
    translations: [
      "we'll investigate at some point (maybe)",
      "we know about the problem and are hoping it fixes itself",
      "acknowledged but no promises",
    ],
    category: "general",
  },
  {
    phrase: "I wanted to provide",
    variations: ["we wanted to provide", "I'd like to provide", "wanted to share"],
    translations: [
      "here's info you didn't ask for but need anyway",
      "incoming wall of text you'll skim at best",
      "let me dump this context on you real quick",
    ],
    category: "email",
  },
  {
    phrase: "taken the time to",
    variations: ["take the time to", "taking the time to"],
    translations: [
      "actually bothered to",
      "carved out 5 minutes from your busy schedule of meetings",
      "invested your precious time (we're flattered, really)",
    ],
    category: "email",
  },
  {
    phrase: "in this regard",
    variations: ["in that regard"],
    translations: [
      "about this specific thing",
      "on this topic (which could've been said in 3 words)",
      "related to what I just said",
    ],
    category: "email",
  },
  {
    phrase: "predictable staffing",
    variations: ["staffing levels", "staffing requirements", "staffing needs"],
    translations: [
      "knowing who's actually going to show up to work",
      "making sure we have enough people (spoiler: we never do)",
      "HR's eternal struggle of filling chairs",
    ],
    category: "hr",
  },
  {
    phrase: "seasonal windows",
    variations: ["seasonal window"],
    translations: [
      "the approved times when you're allowed to have a life",
      "the designated fun-having periods",
      "when the company graciously permits you to take vacation",
    ],
    category: "hr",
  },
  {
    phrase: "preferred periods",
    variations: ["preferred period", "preferred time"],
    translations: [
      "when they want you to do it (not when YOU want to)",
      "management's favorite times for things to happen",
      "the suggested window that's basically mandatory",
    ],
    category: "hr",
  },
  {
    phrase: "consecutive working weeks",
    variations: ["consecutive weeks", "consecutive working days"],
    translations: [
      "uninterrupted grinding with no breaks",
      "back-to-back work weeks (the corporate marathon)",
      "continuous labor, no interruptions allowed",
    ],
    category: "hr",
  },
  {
    phrase: "annual leave",
    variations: ["annual leave policy", "leave policy", "time-off policy"],
    translations: [
      "your precious vacation days that you feel guilty using",
      "the days off you earned but are afraid to take",
      "PTO but make it sound official and British",
    ],
    category: "hr",
  },
  {
    phrase: "carry-over",
    variations: ["carry over", "carried over"],
    translations: [
      "the leftover vacation days you hoarded because you were too scared to use them",
      "rolling your unused freedom into next year",
      "saving days off like they're a rare collectible",
    ],
    category: "hr",
  },
  {
    phrase: "eligible to request",
    variations: ["eligible for", "you will be eligible"],
    translations: [
      "you're allowed to ASK (doesn't mean you'll get it)",
      "congrats, you qualify to beg",
      "permission to grovel: granted",
    ],
    category: "hr",
  },
  {
    phrase: "we would also like to clarify",
    variations: ["we'd also like to clarify", "we also want to clarify"],
    translations: [
      "oh wait, there's MORE confusion to address",
      "turns out the first explanation wasn't clear enough",
      "bonus clarification round because the policy is that confusing",
    ],
    category: "email",
  },
  {
    phrase: "general principles",
    variations: ["guiding principles", "core principles"],
    translations: [
      "the rules (but calling them 'principles' sounds less authoritarian)",
      "guidelines we made up and expect you to follow",
      "fancy way of saying 'the rules are'",
    ],
    category: "management",
  },
  {
    phrase: "thank you again",
    variations: ["thanks again for", "thank you once again"],
    translations: [
      "we already said thanks but here's another round to seem extra grateful",
      "double-thanking because one thank you felt inadequate",
      "wrapping up this email with maximum corporate gratitude",
    ],
    category: "email",
  },
  {
    phrase: "helping ensure",
    variations: ["help ensure", "to help ensure", "helps ensure"],
    translations: [
      "making sure (but with extra corporate words)",
      "doing your part so this doesn't fall apart",
      "contributing to the illusion that things are under control",
    ],
    category: "general",
  },
  {
    phrase: "clear and workable",
    variations: ["clear and practical", "clear and actionable"],
    translations: [
      "something people can actually understand AND do",
      "not just corporate word salad for once",
      "functional AND readable (setting the bar real low here)",
    ],
    category: "general",
  },
  {
    phrase: "has also been uploaded to",
    variations: ["has been uploaded to", "uploaded to the"],
    translations: [
      "we put it somewhere you'll never find",
      "it's on the intranet that nobody checks",
      "filed in the digital abyss of the company portal",
    ],
    category: "email",
  },
  {
    phrase: "the attached",
    variations: ["please see attached", "see attached", "attached herewith", "please find attached"],
    translations: [
      "open the file I attached (50% chance I forgot to attach it)",
      "look at this thing I may or may not have remembered to include",
      "the document that's definitely not attached to this email",
    ],
    category: "email",
  },
  {
    phrase: "needs to be validated",
    variations: ["need to be validated", "require validation"],
    translations: [
      "someone important needs to give the thumbs up",
      "can't do anything until the gatekeepers approve",
      "bureaucracy checkpoint reached",
    ],
    category: "management",
  },
  {
    phrase: "cross-reference",
    variations: ["cross reference", "for cross-reference"],
    translations: [
      "check this against that other thing nobody remembers",
      "compare notes like we're solving a mystery",
      "make sure these two things actually match",
    ],
    category: "general",
  },
  {
    phrase: "touch upon",
    variations: ["briefly touch on", "touched upon", "touches on"],
    translations: [
      "mention vaguely without actually explaining",
      "barely talk about this before moving on",
      "speed-run through this topic",
    ],
    category: "meeting",
  },
  {
    phrase: "flag for review",
    variations: ["flagged for review", "flagging for review"],
    translations: [
      "someone needs to look at this before it becomes a problem",
      "tagging this as 'not my responsibility anymore'",
      "officially making this someone else's problem",
    ],
    category: "management",
  },
  {
    phrase: "by way of background",
    variations: ["for some background", "to provide some background", "for context"],
    translations: [
      "here's the backstory nobody asked for",
      "let me over-explain the history real quick",
      "context dump incoming, brace yourself",
    ],
    category: "email",
  },
  {
    phrase: "reach a consensus",
    variations: ["reached a consensus", "reaching consensus", "build consensus"],
    translations: [
      "everyone pretends to agree so the meeting can end",
      "forced agreement through exhaustion",
      "we argued until everyone gave up and said 'fine'",
    ],
    category: "meeting",
  },
  {
    phrase: "remain the preferred",
    variations: ["remains the preferred", "is the preferred"],
    translations: [
      "this is what we want you to do (hint: it's not optional)",
      "our favorite option that you should definitely pick",
      "the 'suggestion' you'd be wise to follow",
    ],
    category: "management",
  },
  {
    phrase: "limited to",
    variations: ["should be limited to", "requests should be limited to"],
    translations: [
      "you can't have more than this, sorry not sorry",
      "here's your cap, don't even try to exceed it",
      "the maximum amount of fun you're allowed",
    ],
    category: "hr",
  },
  {
    phrase: "ad hoc",
    variations: ["on an ad hoc basis", "ad-hoc"],
    translations: [
      "random, unplanned, winging it",
      "making it up as we go",
      "no plan, just vibes",
    ],
    category: "general",
  },
  {
    phrase: "test ability for any flex",
    variations: ["discuss with your team", "discuss with case teams"],
    translations: [
      "beg your team lead and maybe they'll say yes",
      "negotiate with the people who control your schedule",
      "ask nicely and cross your fingers",
    ],
    category: "hr",
  },
  {
    phrase: "periods of leave",
    variations: ["period of leave", "leave of absence"],
    translations: [
      "the precious time when you're NOT at work",
      "your escape from corporate life (temporary)",
      "officially approved freedom",
    ],
    category: "hr",
  },

  // ── Polite corporate email language ───────────────────────
  {
    phrase: "just wanted to check in",
    variations: ["checking in", "just checking in on this", "checking in on this", "just wanted to check", "wanted to check"],
    translations: [
      "why haven't you responded to me yet",
      "polite stalking via email",
      "I'm watching you and your inbox",
    ],
    category: "email",
  },
  {
    phrase: "I hope all is well",
    variations: ["hope you're doing well", "hope you're well", "trust you are well", "I hope you are well", "hope you are well"],
    translations: [
      "I don't actually care, here's what I need",
      "mandatory opening line before the real request",
      "pleasantry #47 of the day, now let's get to business",
    ],
    category: "email",
  },
  {
    phrase: "I wanted to bring this to your attention",
    variations: ["bringing this to your notice", "flagging this for your awareness", "bringing to your attention"],
    translations: [
      "look at this problem that's now YOUR problem",
      "here's something stressful, you're welcome",
      "officially making you aware so I'm not liable",
    ],
    category: "email",
  },
  {
    phrase: "I appreciate your prompt attention to this",
    variations: ["appreciate your timely response", "your prompt response would be appreciated"],
    translations: [
      "do this RIGHT NOW, I'm being fake polite",
      "hurry up but in business English",
      "the clock is ticking and so is my patience",
    ],
    category: "email",
  },
  {
    phrase: "sorry to bother you",
    variations: ["apologies for the interruption", "sorry to trouble you", "hate to bother you"],
    translations: [
      "I'm not sorry at all, I need something",
      "pretending to feel bad about emailing you",
      "not sorry but corporate etiquette says I should say this",
    ],
    category: "email",
  },
  {
    phrase: "confirming receipt",
    variations: ["acknowledged with thanks", "this is to confirm receipt", "received with thanks"],
    translations: [
      "yep, got it",
      "I saw your email, don't panic",
      "read receipt but make it professional",
    ],
    category: "email",
  },
  {
    phrase: "thank you for your continued support",
    variations: ["as always appreciate your support", "grateful for your support", "appreciate your continued support"],
    translations: [
      "thanks for not quitting yet",
      "we need you to keep doing free emotional labor",
      "please don't stop helping us, we'd be lost",
    ],
    category: "email",
  },
  {
    phrase: "just to keep you posted",
    variations: ["keeping you in the loop", "just an update for your records", "for your awareness"],
    translations: [
      "here's info you didn't ask for but now you have it",
      "adding this to your mental pile of things to track",
      "FYI dump incoming, good luck",
    ],
    category: "email",
  },
  {
    phrase: "I'll defer to your judgment",
    variations: ["I'll leave that to your discretion", "trusting your judgment on this", "at your discretion"],
    translations: [
      "I don't want to be responsible if this goes wrong",
      "your call, but also your fault if it fails",
      "passing the decision and the blame to you",
    ],
    category: "email",
  },
  {
    phrase: "no worries if not",
    variations: ["no pressure", "totally understand if you can't", "no rush on this"],
    translations: [
      "there ARE worries, do it",
      "it's definitely a worry but I'm pretending to be chill",
      "this is 100% a request disguised as optional",
    ],
    category: "email",
  },
  {
    phrase: "reattached for your convenience",
    variations: ["re-sharing for easy reference", "attaching again", "resending for your convenience"],
    translations: [
      "you clearly didn't open it the first time",
      "here it is AGAIN since you ignored it",
      "attempt #2 at getting you to read the attachment",
    ],
    category: "email",
  },
  {
    phrase: "I appreciate the heads-up",
    variations: ["thanks for flagging", "thanks for the early warning", "thanks for the heads up"],
    translations: [
      "great, now I have to deal with this",
      "cool, more problems to worry about",
      "wish I didn't know this but thanks I guess",
    ],
    category: "email",
  },
  {
    phrase: "as you no doubt are aware",
    variations: ["as I'm sure you know", "as you'll recall", "as I'm sure you're aware"],
    translations: [
      "you should know this already (but probably don't)",
      "I'm assuming you've been paying attention (bold assumption)",
      "pretending you're informed so you can't claim ignorance later",
    ],
    category: "email",
  },

  // ── Passive-aggressive corporate phrases ──────────────────
  {
    phrase: "I'm a little confused",
    variations: ["I'm slightly confused by", "I'm having trouble understanding"],
    translations: [
      "this makes zero sense and I'm being polite about it",
      "what you said is wrong and I'm letting you figure that out",
      "I understand perfectly, I just disagree",
    ],
    category: "email",
  },
  {
    phrase: "for future reference",
    variations: ["just so we're all aware for next time", "for next time"],
    translations: [
      "don't do this again",
      "I'm setting a rule because you messed up",
      "learn from this mistake (mine is not saying it sooner)",
    ],
    category: "email",
  },
  {
    phrase: "any updates on this",
    variations: ["where are we on this", "any movement on this", "any progress on this"],
    translations: [
      "why is this not done yet",
      "I've been waiting and I'm running out of patience",
      "this is my 'why are you ghosting me' email",
    ],
    category: "email",
  },
  {
    phrase: "as previously stated",
    variations: ["as noted earlier", "as outlined in my previous message", "as mentioned previously"],
    translations: [
      "I ALREADY SAID THIS, pay attention",
      "re-read my last email because you clearly didn't",
      "this is getting repetitive and I'm annoyed",
    ],
    category: "email",
  },
  {
    phrase: "I'm a bit concerned",
    variations: ["I have some concerns about", "this gives me pause", "I have concerns"],
    translations: [
      "this is bad and I'm being diplomatic about it",
      "red flags everywhere but I'll say it nicely",
      "I think this is a terrible idea but corporate-ly",
    ],
    category: "email",
  },
  {
    phrase: "just to clarify",
    variations: ["to be clear", "let me clarify", "for clarity"],
    translations: [
      "you misunderstood (or I explained it badly)",
      "let me say this again but slower",
      "clearing up the mess from my last message",
    ],
    category: "email",
  },
  {
    phrase: "thanks for your patience",
    variations: ["appreciate your patience on this", "thank you for bearing with us", "bear with me"],
    translations: [
      "sorry we're slow and you have no choice but to wait",
      "we know this is taking forever, please don't yell",
      "you've been waiting too long and we know it",
    ],
    category: "email",
  },
  {
    phrase: "not sure if you saw my last email",
    variations: ["just bumping this up", "following up on my earlier note", "bumping this to the top"],
    translations: [
      "you definitely saw it and chose to ignore me",
      "I know you read this, Outlook has read receipts",
      "here's my passive-aggressive reminder that you owe me a reply",
    ],
    category: "email",
  },
  {
    phrase: "interesting perspective",
    variations: ["that's an interesting point", "interesting take", "that's one way to look at it"],
    translations: [
      "I completely disagree but I'm being polite",
      "wrong, but I'm not going to say that out loud",
      "noted and immediately dismissed",
    ],
    category: "email",
  },
  {
    phrase: "will take this under advisement",
    variations: ["taken under advisement", "we'll take that into consideration"],
    translations: [
      "your suggestion is going straight to the trash",
      "we heard you and will proceed to ignore this",
      "filed under 'never gonna happen'",
    ],
    category: "email",
  },
  {
    phrase: "duly noted",
    variations: ["noted", "noted with thanks"],
    translations: [
      "I read it and I do not care",
      "acknowledged and immediately forgotten",
      "the corporate equivalent of 'k'",
    ],
    category: "email",
  },
  {
    phrase: "apologies for the delay",
    variations: ["sorry for the late reply", "apologies for the delayed response", "sorry for the slow response"],
    translations: [
      "I saw your email days ago and chose peace",
      "I was ignoring this until I couldn't anymore",
      "I procrastinated on replying and now I feel slightly guilty",
    ],
    category: "email",
  },
  {
    phrase: "much appreciated",
    variations: ["greatly appreciated", "would be much appreciated"],
    translations: [
      "do the thing I asked, thanks",
      "I'm grateful (or at least pretending to be)",
      "corporate gratitude that costs nothing",
    ],
    category: "email",
  },
  {
    phrase: "I was surprised to see",
    variations: ["I was a bit disappointed that", "it was unfortunate that"],
    translations: [
      "I'm mad about this but keeping it professional",
      "someone messed up and I'm being diplomatic",
      "this was NOT what I expected and I'm not happy",
    ],
    category: "email",
  },

  // ── HR and policy language ────────────────────────────────
  {
    phrase: "onboarding",
    variations: ["new hire onboarding", "onboarding process", "employee onboarding"],
    translations: [
      "the overwhelming first week where you forget everything",
      "drinking from a firehose of company info",
      "death by orientation slides and compliance training",
    ],
    category: "hr",
  },
  {
    phrase: "offboarding",
    variations: ["exit process", "separation process", "employee offboarding"],
    translations: [
      "the corporate breakup process",
      "collecting your badge and dignity on the way out",
      "HR's way of saying 'bye forever'",
    ],
    category: "hr",
  },
  {
    phrase: "upskilling",
    variations: ["skills development", "capability building", "skill enhancement"],
    translations: [
      "learning new stuff so you can do more work for the same pay",
      "training you won't have time for but need to complete",
      "getting better at things the company needs (not what you want)",
    ],
    category: "hr",
  },
  {
    phrase: "voluntary attrition",
    variations: ["voluntary turnover", "voluntary separation"],
    translations: [
      "people quitting (can't blame them)",
      "employees choosing freedom over this place",
      "the exodus HR is trying to spin positively",
    ],
    category: "hr",
  },
  {
    phrase: "regretted attrition",
    variations: ["regrettable turnover", "regretted loss"],
    translations: [
      "good people left because we didn't pay them enough",
      "the talent we actually wanted to keep but didn't",
      "people we miss now that they're gone (shoulda paid more)",
    ],
    category: "hr",
  },
  {
    phrase: "flight risk",
    variations: ["retention risk", "at-risk employee"],
    translations: [
      "someone who's definitely job hunting right now",
      "they've got one foot out the door",
      "updating their LinkedIn as we speak",
    ],
    category: "hr",
  },
  {
    phrase: "quiet firing",
    variations: ["managing out", "constructive dismissal"],
    translations: [
      "making your life miserable until you quit so they don't have to fire you",
      "the slow freeze-out strategy",
      "corporate ghost protocol — you're dead to them but still employed",
    ],
    category: "hr",
  },
  {
    phrase: "golden handcuffs",
    variations: ["retention package", "stay bonus", "deferred compensation"],
    translations: [
      "money that keeps you trapped at a job you hate",
      "the financial ball and chain",
      "too expensive to leave, too miserable to stay",
    ],
    category: "hr",
  },
  {
    phrase: "individual contributor",
    variations: ["IC", "senior IC"],
    translations: [
      "someone who does actual work instead of managing people",
      "the people who build things while managers have meetings",
      "not a manager (and probably happier for it)",
    ],
    category: "hr",
  },
  {
    phrase: "headcount",
    variations: ["FTE count", "staff count", "personnel allocation"],
    translations: [
      "people, but dehumanized into a number",
      "humans reduced to a line item in a spreadsheet",
      "the budget number that determines how many humans you get",
    ],
    category: "hr",
  },
  {
    phrase: "people operations",
    variations: ["people ops", "people team", "human capital management"],
    translations: [
      "HR but rebranded to sound less scary",
      "HR wearing a friendlier hat",
      "the department formerly known as Human Resources",
    ],
    category: "hr",
  },
  {
    phrase: "high potential",
    variations: ["HiPo", "high-potential talent", "top talent"],
    translations: [
      "the favorites who get all the good opportunities",
      "teacher's pet but in corporate",
      "the chosen ones who management actually invests in",
    ],
    category: "hr",
  },
  {
    phrase: "employee engagement",
    variations: ["engagement score", "employee sentiment", "pulse survey"],
    translations: [
      "a survey asking if you're happy (spoiler: the results won't change anything)",
      "measuring morale with a form instead of a raise",
      "HR's attempt to quantify how dead inside everyone is",
    ],
    category: "hr",
  },
  {
    phrase: "span of control",
    variations: ["direct report ratio", "management ratio"],
    translations: [
      "how many people one manager has to pretend to manage",
      "the number of humans under your corporate jurisdiction",
      "your official headache count",
    ],
    category: "hr",
  },
  {
    phrase: "dotted line reporting",
    variations: ["indirect reporting", "matrix reporting"],
    translations: [
      "you have two bosses and neither takes full responsibility for you",
      "corporate confusion about who you actually report to",
      "double the managers, double the meetings, same pay",
    ],
    category: "hr",
  },
  {
    phrase: "voluntary separation program",
    variations: ["early retirement package", "voluntary redundancy"],
    translations: [
      "we'll pay you to leave before we have to fire you",
      "the polite 'please go away' package",
      "golden parachute for people they want gone but can't fire",
    ],
    category: "hr",
  },
  {
    phrase: "headcount reduction",
    variations: ["headcount optimization", "FTE reduction", "reduction in force"],
    translations: [
      "layoffs but make it sound like math",
      "people are losing their jobs (but said with spreadsheet energy)",
      "firing humans, optimized",
    ],
    category: "hr",
  },
  {
    phrase: "role elimination",
    variations: ["position elimination", "impacted roles", "affected positions"],
    translations: [
      "your job no longer exists, surprise!",
      "we deleted your role like a file we don't need anymore",
      "you're not fired — your JOB is fired (totally different)",
    ],
    category: "hr",
  },

  // ── Management and leadership speak ───────────────────────
  {
    phrase: "the ask",
    variations: ["the big ask", "what's the ask here", "the ask is"],
    translations: [
      "what they actually want you to do",
      "the real request hiding behind all the fluff",
      "the thing they need but took 500 words to get to",
    ],
    category: "management",
  },
  {
    phrase: "socialize this",
    variations: ["socialize the idea", "float this around", "socializing this"],
    translations: [
      "gossip about this idea to see if people hate it",
      "test the waters before committing",
      "spread the word and gauge reactions before going official",
    ],
    category: "management",
  },
  {
    phrase: "pressure test",
    variations: ["stress test", "poke holes in", "kick the tires"],
    translations: [
      "try to break this idea before we commit to it",
      "see if this falls apart under scrutiny",
      "professionally roast this plan to find the flaws",
    ],
    category: "management",
  },
  {
    phrase: "guardrails",
    variations: ["put guardrails around", "within guardrails"],
    translations: [
      "rules, but calling them 'guardrails' sounds less controlling",
      "limits wrapped in a safety metaphor",
      "the boundaries you can't cross (but nicely named)",
    ],
    category: "management",
  },
  {
    phrase: "cadence",
    variations: ["regular cadence", "weekly cadence", "at what cadence"],
    translations: [
      "how often (just say 'how often')",
      "the schedule of recurring meetings nobody wants",
      "frequency, but make it sound rhythmic and intentional",
    ],
    category: "management",
  },
  {
    phrase: "table stakes",
    variations: ["cost of entry", "baseline expectation"],
    translations: [
      "the bare minimum to not be embarrassing",
      "the stuff you HAVE to do, not the stuff that makes you special",
      "if you don't have this, don't even show up",
    ],
    category: "management",
  },
  {
    phrase: "in the weeds",
    variations: ["down in the weeds", "too granular", "getting into the weeds"],
    translations: [
      "way too deep into boring details",
      "lost in specifics that 90% of the room doesn't care about",
      "someone went too detailed and now everyone's eyes are glazed over",
    ],
    category: "management",
  },
  {
    phrase: "buy-in",
    variations: ["stakeholder buy-in", "get buy-in", "secure buy-in"],
    translations: [
      "getting people to agree (or at least stop objecting)",
      "the approval marathon before you can do anything",
      "convincing everyone to not block your idea",
    ],
    category: "management",
  },
  {
    phrase: "champion this",
    variations: ["own this initiative", "sponsor this", "be the champion for"],
    translations: [
      "you're now personally responsible for making this succeed",
      "congratulations, this is your baby now",
      "we need someone to blame if it fails — you're it",
    ],
    category: "management",
  },
  {
    phrase: "cascade",
    variations: ["cascade this down", "cascade the message", "cascading"],
    translations: [
      "pass the message down the chain like corporate telephone",
      "tell your team what I just told you (good luck keeping it accurate)",
      "information waterfall that gets more distorted at each level",
    ],
    category: "management",
  },
  {
    phrase: "headwinds",
    variations: ["facing headwinds", "macro headwinds", "market headwinds"],
    translations: [
      "things aren't going well but let's use a sailing metaphor",
      "obstacles (but make them sound dramatic and weather-related)",
      "problems, but the CEO version",
    ],
    category: "management",
  },
  {
    phrase: "tailwinds",
    variations: ["positive tailwinds", "riding the tailwind"],
    translations: [
      "things are going well and we're taking credit for luck",
      "favorable conditions we had nothing to do with",
      "good vibes (the business metaphor version)",
    ],
    category: "management",
  },
  {
    phrase: "top of mind",
    variations: ["front of mind", "keeping this top of mind"],
    translations: [
      "the thing I'm obsessing about and you should too",
      "thinking about this constantly (or claiming to)",
      "priority #1 this week (was priority #47 last week)",
    ],
    category: "management",
  },
  {
    phrase: "raise the bar",
    variations: ["elevate the standard", "set a higher bar", "raising the bar"],
    translations: [
      "expect more from everyone without paying more",
      "making the standards harder to meet",
      "yesterday's best is today's bare minimum",
    ],
    category: "management",
  },
  {
    phrase: "traction",
    variations: ["getting traction", "gaining traction", "building momentum"],
    translations: [
      "it's actually working for once",
      "people are starting to care (finally)",
      "progress that we can show in a slide deck",
    ],
    category: "management",
  },
  {
    phrase: "de-risk",
    variations: ["mitigate risk", "de-risking", "reduce exposure"],
    translations: [
      "make this less likely to blow up in our faces",
      "cover our butts in case things go wrong",
      "add safety nets because we don't trust this plan",
    ],
    category: "management",
  },
  {
    phrase: "triangulate",
    variations: ["triangulating", "validate from multiple angles"],
    translations: [
      "check this from three different directions because we trust nobody",
      "over-verify everything like a corporate detective",
      "cross-check until we're too exhausted to doubt it",
    ],
    category: "management",
  },
  {
    phrase: "synthesize",
    variations: ["distill", "synthesize the findings", "distill this down"],
    translations: [
      "take 500 pages and make it one slide",
      "condense weeks of work into 3 bullet points",
      "turn information overload into a digestible sound bite",
    ],
    category: "management",
  },
  {
    phrase: "elephant in the room",
    variations: ["the unspoken issue", "what nobody's saying"],
    translations: [
      "the obvious problem everyone's pretending doesn't exist",
      "the awkward truth nobody wants to bring up",
      "we all see it, nobody wants to be the one to say it",
    ],
    category: "management",
  },
  {
    phrase: "granular",
    variations: ["get granular", "at a granular level", "more granular"],
    translations: [
      "zoom in until your eyes bleed from detail",
      "painfully specific",
      "so detailed it'll put you to sleep",
    ],
    category: "management",
  },
  {
    phrase: "ownership mindset",
    variations: ["act like an owner", "founder mentality"],
    translations: [
      "care about this company as if you owned it (you don't, and never will)",
      "have the stress of an owner with the salary of an employee",
      "pretend you have equity when you have none",
    ],
    category: "management",
  },
  {
    phrase: "deep bench",
    variations: ["strong bench", "bench strength", "talent depth"],
    translations: [
      "we have backup people if the main ones quit",
      "enough talent that losing one person won't cause panic",
      "the substitute players on the corporate team",
    ],
    category: "management",
  },
  {
    phrase: "optionality",
    variations: ["preserving optionality", "keeping options open"],
    translations: [
      "not committing to anything because we can't decide",
      "the art of never making a decision",
      "keeping every door open because we're scared to walk through one",
    ],
    category: "management",
  },
  {
    phrase: "herding cats",
    variations: ["like herding cats", "wrangling the team"],
    translations: [
      "trying to organize people who refuse to be organized",
      "managing chaos with a smile",
      "the daily struggle of getting adults to cooperate",
    ],
    category: "management",
  },
  {
    phrase: "light a fire under",
    variations: ["create urgency", "inject some urgency"],
    translations: [
      "scare people into working faster",
      "panic-motivate the team",
      "make everyone stressed enough to actually move",
    ],
    category: "management",
  },
  {
    phrase: "executive decision",
    variations: ["leadership call", "making the call"],
    translations: [
      "the boss decided and discussion is over",
      "someone important chose, everyone else cope",
      "democracy is dead, the exec has spoken",
    ],
    category: "management",
  },

  // ── Consulting and professional services jargon ───────────
  {
    phrase: "on the beach",
    variations: ["between engagements", "on the bench", "unassigned"],
    translations: [
      "unemployed but make it sound like vacation",
      "waiting for work and pretending to be chill about it",
      "benched like a backup player hoping to get called in",
    ],
    category: "consulting",
  },
  {
    phrase: "slide deck",
    variations: ["the deck", "put it in a deck", "deck it out"],
    translations: [
      "PowerPoint, the corporate love language",
      "death by slides",
      "the 47-page presentation nobody will read past slide 3",
    ],
    category: "consulting",
  },
  {
    phrase: "strawman",
    variations: ["straw man", "strawman proposal", "first-pass strawman"],
    translations: [
      "a rough draft we're pretending is just a suggestion",
      "the 'bad' version we made so the real one looks better",
      "a proposal designed to be torn apart (that's the point)",
    ],
    category: "consulting",
  },
  {
    phrase: "whitespace",
    variations: ["white space opportunity", "whitespace analysis"],
    translations: [
      "stuff nobody's doing yet (probably for a reason)",
      "an opportunity we found by staring at a gap in a chart",
      "the business equivalent of 'we could put something there'",
    ],
    category: "consulting",
  },
  {
    phrase: "greenfield",
    variations: ["greenfield project", "greenfield opportunity"],
    translations: [
      "starting from scratch (exciting AND terrifying)",
      "no legacy code to blame, all future mistakes are yours",
      "blank canvas energy — the honeymoon phase of a project",
    ],
    category: "consulting",
  },
  {
    phrase: "scope creep",
    variations: ["out of scope", "in scope", "the scope keeps growing"],
    translations: [
      "the project growing like a monster because nobody says no",
      "when a 'small' project becomes your entire life",
      "feature requests breeding like rabbits",
    ],
    category: "consulting",
  },
  {
    phrase: "workstream",
    variations: ["parallel workstream", "multiple workstreams", "cross-workstream"],
    translations: [
      "a sub-project within the project within the program (inception)",
      "corporate nesting dolls of work",
      "a stream of work that'll probably merge into chaos",
    ],
    category: "consulting",
  },
  {
    phrase: "critical path",
    variations: ["on the critical path", "critical path items", "gating item"],
    translations: [
      "the stuff that if delayed, everything else is screwed",
      "the dominoes that CANNOT fall late",
      "the no-pressure, must-not-fail sequence of tasks",
    ],
    category: "consulting",
  },
  {
    phrase: "tiger team",
    variations: ["SWAT team", "task force", "rapid response team"],
    translations: [
      "a group of people thrown at a problem in panic mode",
      "the 'oh no this is really bad' emergency squad",
      "special ops but for corporate emergencies",
    ],
    category: "consulting",
  },
  {
    phrase: "value proposition",
    variations: ["unique value proposition", "UVP", "our value prop"],
    translations: [
      "why anyone should care about what we're selling",
      "the pitch, basically",
      "the reason we exist (we think)",
    ],
    category: "consulting",
  },
  {
    phrase: "go-to-market",
    variations: ["GTM", "go-to-market strategy", "GTM plan"],
    translations: [
      "the plan for actually selling this thing",
      "how we're going to convince people to buy it",
      "marketing + sales + prayers",
    ],
    category: "consulting",
  },
  {
    phrase: "end-to-end",
    variations: ["end to end", "E2E", "full end-to-end"],
    translations: [
      "the whole thing, start to finish, no shortcuts",
      "everything from A to Z (and all the mess in between)",
      "we handle it all (allegedly)",
    ],
    category: "consulting",
  },
  {
    phrase: "turnkey solution",
    variations: ["turnkey", "plug and play"],
    translations: [
      "supposedly ready to use immediately (narrator: it wasn't)",
      "just flip a switch! (5 months of setup later...)",
      "the 'it just works' promise that never does",
    ],
    category: "consulting",
  },
  {
    phrase: "bespoke solution",
    variations: ["bespoke", "custom-built solution", "tailor-made"],
    translations: [
      "expensive and custom-made just for you",
      "artisanal code, hand-crafted with love (and a huge invoice)",
      "fancy word for 'custom' to justify the price tag",
    ],
    category: "consulting",
  },
  {
    phrase: "hypothesis-driven",
    variations: ["start with a hypothesis", "hypothesis-first"],
    translations: [
      "guess first, find evidence later",
      "we already have an answer, now let's find data to support it",
      "professional guessing with extra steps",
    ],
    category: "consulting",
  },
  {
    phrase: "key takeaway",
    variations: ["main takeaway", "primary insight", "the so what"],
    translations: [
      "the one thing to remember from this 2-hour meeting",
      "TLDR for people who weren't paying attention",
      "the only slide that matters in this entire deck",
    ],
    category: "consulting",
  },
  {
    phrase: "first pass",
    variations: ["quick pass", "first cut", "rough cut", "initial take"],
    translations: [
      "the sloppy first attempt we'll polish later (maybe)",
      "version 0.1 that'll somehow become the final version",
      "don't judge this too hard, it's just the beginning (it's always the final)",
    ],
    category: "consulting",
  },
  {
    phrase: "business case",
    variations: ["build the business case", "make the case", "justify the business case"],
    translations: [
      "prove this will make money or it's getting killed",
      "the document that decides if your idea lives or dies",
      "convince finance this isn't a waste of money",
    ],
    category: "consulting",
  },
  {
    phrase: "run rate",
    variations: ["annual run rate", "current run rate"],
    translations: [
      "if we keep going at this speed, here's where we'll end up",
      "math based on assuming nothing changes (it always does)",
      "projecting the future based on vibes and current numbers",
    ],
    category: "consulting",
  },
  {
    phrase: "MECE",
    variations: ["mutually exclusive collectively exhaustive"],
    translations: [
      "consulting's favorite acronym that means 'don't overlap, don't miss anything'",
      "the OCD framework of categorization",
      "everything in its place, nothing left out (consulting 101)",
    ],
    category: "consulting",
  },

  // ── Meeting management phrases ────────────────────────────
  {
    phrase: "let's be mindful of everyone's time",
    variations: ["mindful of time", "conscious of the clock", "respect everyone's time"],
    translations: [
      "shut up, you're rambling",
      "this meeting is going too long and it's YOUR fault",
      "polite way of saying 'wrap it up already'",
    ],
    category: "meeting",
  },
  {
    phrase: "can you speak to that",
    variations: ["do you want to take that", "want to jump in on that", "can you walk us through"],
    translations: [
      "surprise! you're presenting now, hope you're ready",
      "putting you on the spot in front of everyone",
      "your turn to talk, no pressure (all the pressure)",
    ],
    category: "meeting",
  },
  {
    phrase: "let's not go down that rabbit hole",
    variations: ["that's a rabbit hole", "let's not rat-hole on this"],
    translations: [
      "this topic is a trap and we need to escape",
      "we could talk about this for hours and solve nothing",
      "danger zone, abort abort abort",
    ],
    category: "meeting",
  },
  {
    phrase: "who wants to kick this off",
    variations: ["who wants to get us started", "take it away", "the floor is yours"],
    translations: [
      "awkward silence until someone volunteers",
      "the meeting version of 'who wants to go first'",
      "please someone start talking so I don't have to",
    ],
    category: "meeting",
  },
  {
    phrase: "let's do a round-robin",
    variations: ["go around the room", "let's hear from everyone"],
    translations: [
      "everyone must speak whether they have something to say or not",
      "forced participation for introverts' worst nightmare",
      "going around the table so nobody can hide",
    ],
    category: "meeting",
  },
  {
    phrase: "any other business",
    variations: ["AOB", "anything else before we wrap", "any final items"],
    translations: [
      "please say no so we can leave",
      "the moment everyone prays nobody has anything to add",
      "the question that could set you free or trap you for 30 more minutes",
    ],
    category: "meeting",
  },
  {
    phrase: "let's timebox this",
    variations: ["timebox it", "timeboxing this discussion"],
    translations: [
      "setting a timer because we can't be trusted to stay on topic",
      "you have 5 minutes, make it count",
      "corporate speed round, go go go",
    ],
    category: "meeting",
  },
  {
    phrase: "chime in",
    variations: ["jump in", "weigh in", "feel free to chime in"],
    translations: [
      "interrupt whenever you want (or don't, that's fine too)",
      "please contribute so this isn't a monologue",
      "throw your opinion into the chaos",
    ],
    category: "meeting",
  },
  {
    phrase: "pencil that in",
    variations: ["pencil in a time", "tentatively schedule", "soft hold"],
    translations: [
      "schedule it but with zero commitment",
      "put it on the calendar knowing it'll get moved",
      "a meeting that's 50/50 on actually happening",
    ],
    category: "meeting",
  },
  {
    phrase: "war room",
    variations: ["command center", "situation room", "deal room"],
    translations: [
      "a room where stressed people stare at screens together",
      "corporate crisis mode with dramatic naming",
      "the panic room but with whiteboards",
    ],
    category: "meeting",
  },

  // ── Corporate filler and transition phrases ───────────────
  {
    phrase: "to your point",
    variations: ["to that point", "building on your point"],
    translations: [
      "I'm about to agree with you (or completely change the subject)",
      "using your words as a springboard for my own agenda",
      "pretending to validate you before saying something different",
    ],
    category: "general",
  },
  {
    phrase: "piggyback on that",
    variations: ["piggybacking on that", "to piggyback off what X said", "building on what X said"],
    translations: [
      "I'm about to repeat what they said but slightly different",
      "same idea, different mouth",
      "stealing their point and rephrasing it as mine",
    ],
    category: "general",
  },
  {
    phrase: "from my perspective",
    variations: ["from where I sit", "the way I see it", "from my vantage point"],
    translations: [
      "in my opinion (but fancier)",
      "here's my take (warning: it might be biased)",
      "I'm about to share my view and I expect you to care",
    ],
    category: "general",
  },
  {
    phrase: "at a high level",
    variations: ["from a high level", "high-level overview", "at a macro level"],
    translations: [
      "vaguely, without any useful details",
      "zoomed out so far the specifics don't matter",
      "the executive summary for people who won't read further",
    ],
    category: "general",
  },
  {
    phrase: "just to play devil's advocate",
    variations: ["playing devil's advocate", "to push back a little", "let me challenge that"],
    translations: [
      "I disagree but I'm pretending it's hypothetical",
      "about to argue with you for fun (or because I think you're wrong)",
      "I'm going to be annoying on purpose and call it 'critical thinking'",
    ],
    category: "general",
  },
  {
    phrase: "does that resonate",
    variations: ["that resonates with me", "I resonate with that", "resonates"],
    translations: [
      "do you feel this? like emotionally?",
      "agree with me but make it sound spiritual",
      "corporate way of asking 'does this vibe with you'",
    ],
    category: "general",
  },
  {
    phrase: "my two cents",
    variations: ["just my two cents", "for what it's worth", "FWIW"],
    translations: [
      "here's my unsolicited opinion",
      "nobody asked but I'm sharing anyway",
      "free advice worth exactly what you paid for it",
    ],
    category: "general",
  },
  {
    phrase: "pick your brain",
    variations: ["pick your brain on something", "brain dump", "thought partnership"],
    translations: [
      "steal your ideas for free",
      "a meeting where I extract your knowledge and give nothing back",
      "let me borrow your expertise without crediting you",
    ],
    category: "general",
  },
  {
    phrase: "gut feel",
    variations: ["my gut says", "gut instinct", "directionally it feels"],
    translations: [
      "I have no data but here's my opinion anyway",
      "vibes-based decision making",
      "professional intuition (fancy word for guessing)",
    ],
    category: "general",
  },
  {
    phrase: "quick wins",
    variations: ["easy wins", "fast wins", "low-effort high-impact"],
    translations: [
      "the easy stuff we do to pretend we're productive",
      "small victories to distract from the big problems",
      "the corporate equivalent of checking off 'make bed' on your to-do list",
    ],
    category: "general",
  },
  {
    phrase: "red tape",
    variations: ["bureaucracy", "process overhead", "administrative burden"],
    translations: [
      "the 47 approval forms standing between you and getting things done",
      "corporate obstacles that exist because someone messed up 10 years ago",
      "rules and processes that slow everything to a crawl",
    ],
    category: "general",
  },
  {
    phrase: "eat the frog",
    variations: ["tackle the hard thing first", "frog first"],
    translations: [
      "do the awful task first so everything else feels easy",
      "get the misery out of the way early",
      "start your day with pain and it can only get better",
    ],
    category: "general",
  },

  // ── Corporate change and announcement language ────────────
  {
    phrase: "exciting changes ahead",
    variations: ["exciting times ahead", "exciting news", "exciting opportunity"],
    translations: [
      "something's changing and they want you to be happy about it (you won't be)",
      "corporate euphemism for 'things are about to get weird'",
      "whenever they say 'exciting' it means the opposite",
    ],
    category: "general",
  },
  {
    phrase: "new chapter",
    variations: ["next chapter", "turning the page", "new era"],
    translations: [
      "something bad ended and we're pretending to be optimistic",
      "corporate rebrand of 'we messed up, starting over'",
      "the motivational poster version of 'things changed'",
    ],
    category: "general",
  },
  {
    phrase: "evolving landscape",
    variations: ["rapidly evolving", "ever-changing landscape", "dynamic landscape"],
    translations: [
      "everything's changing and we can't keep up",
      "we have no idea what's happening but it sounds dramatic",
      "the market is chaos and we're along for the ride",
    ],
    category: "general",
  },
  {
    phrase: "unprecedented times",
    variations: ["these unprecedented times", "challenging times", "uncertain times"],
    translations: [
      "everything is on fire but let's sound poetic about it",
      "things are bad and we don't know what to do",
      "the corporate version of 'this is fine' meme",
    ],
    category: "general",
  },
  {
    phrase: "navigate challenges",
    variations: ["navigate this", "navigating challenges", "navigate uncertainty"],
    translations: [
      "survive this mess",
      "stumble through problems and call it 'navigating'",
      "winging it but make it sound strategic",
    ],
    category: "general",
  },
  {
    phrase: "sunset",
    variations: ["sunsetting", "being sunset", "sunsetted"],
    translations: [
      "killing it but making it sound peaceful and beautiful",
      "this thing is dying and we gave it a pretty name",
      "RIP to this product/feature, may it rest in corporate peace",
    ],
    category: "tech",
  },
  {
    phrase: "resource actions",
    variations: ["workforce actions", "personnel actions", "staffing adjustments"],
    translations: [
      "layoffs but make it sound like a corporate board game",
      "people losing their jobs, disguised as logistics",
      "the most dehumanizing way to say 'firing people'",
    ],
    category: "hr",
  },
  {
    phrase: "operational efficiency",
    variations: ["driving efficiency", "efficiency gains", "doing more with less"],
    translations: [
      "getting more work out of fewer people",
      "corporate speak for 'the budget got cut'",
      "squeezing blood from a stone but calling it optimization",
    ],
    category: "management",
  },
  {
    phrase: "strategic realignment",
    variations: ["strategic refocus", "realigning priorities", "strategic pivot"],
    translations: [
      "everything we were doing was wrong so we're starting over",
      "fancy way of admitting the last strategy failed",
      "new direction because the old one was a disaster",
    ],
    category: "management",
  },

  // ── Tech and project management ───────────────────────────
  {
    phrase: "technical debt",
    variations: ["tech debt", "legacy debt", "paying down tech debt"],
    translations: [
      "the mess we made by cutting corners and now it haunts us",
      "shortcuts from the past that are now everyone's problem",
      "code written at 2am that we've been scared to touch since",
    ],
    category: "tech",
  },
  {
    phrase: "runway",
    variations: ["months of runway", "extending the runway"],
    translations: [
      "how long before we run out of money",
      "the countdown timer on this company's bank account",
      "how long we can survive before reality catches up",
    ],
    category: "tech",
  },
  {
    phrase: "roadmap",
    variations: ["product roadmap", "on the roadmap"],
    translations: [
      "the fantasy plan that changes every quarter",
      "a map that gets redrawn before you reach the first destination",
      "optimistic timeline that nobody actually follows",
    ],
    category: "tech",
  },
  {
    phrase: "net new",
    variations: ["net new revenue", "net new customers"],
    translations: [
      "genuinely new, not just recycled old stuff",
      "actually new and not existing things we're re-counting",
      "new-new, not 'we repackaged something old' new",
    ],
    category: "tech",
  },
  {
    phrase: "out of pocket",
    variations: ["OOP", "I'll be OOP"],
    translations: [
      "unreachable, don't even try",
      "I'm going off-grid, good luck without me",
      "disappearing from Slack and email, deal with it",
    ],
    category: "general",
  },
  {
    phrase: "close of business",
    variations: ["COB", "close of play", "end of business"],
    translations: [
      "by the time I leave today (assuming I leave on time for once)",
      "another way of saying 'today' but making it sound official",
      "5pm-ish, but the email will arrive at 5:01",
    ],
    category: "general",
  },
  {
    phrase: "lipstick on a pig",
    variations: ["polishing a turd", "window dressing", "cosmetic fix"],
    translations: [
      "making something terrible look slightly less terrible",
      "superficial improvements on a fundamentally broken thing",
      "pretty packaging on a garbage product",
    ],
    category: "general",
  },
  {
    phrase: "canary in the coalmine",
    variations: ["early warning sign", "leading indicator"],
    translations: [
      "the first sign that everything's about to go wrong",
      "the red flag before the bigger red flags",
      "if this fails, we're all in trouble",
    ],
    category: "general",
  },
  {
    phrase: "knowledge transfer",
    variations: ["KT", "knowledge sharing", "info dump"],
    translations: [
      "desperately downloading someone's brain before they quit",
      "the frantic 2-week period where a leaving employee tries to teach you everything",
      "brain extraction before someone walks out the door",
    ],
    category: "general",
  },

  // ── Email phrases (expansion) ─────────────────────────────
  {
    phrase: "many thanks",
    variations: ["thanks so much", "thanks ever so much"],
    translations: [
      "bye (but make it sound grateful)",
      "corporate sign-off #12 that means absolutely nothing",
      "I'm wrapping up this email and being fake warm about it",
    ],
    category: "email",
  },
  {
    phrase: "please let me know",
    variations: ["do let me know", "let me know if you need anything", "let me know if you have any questions"],
    translations: [
      "please don't actually let me know, I'm busy",
      "this is my email exit strategy",
      "I'm offering help I hope you won't need",
    ],
    category: "email",
  },
  {
    phrase: "looking forward to hearing from you",
    variations: ["looking forward to your response", "look forward to hearing", "looking forward to your reply"],
    translations: [
      "respond to me or I'll follow up aggressively",
      "the ball is in your court and I'm watching",
      "polite way of saying 'answer me'",
    ],
    category: "email",
  },
  {
    phrase: "for your review",
    variations: ["for your review and approval", "for your consideration", "for your perusal"],
    translations: [
      "please look at this thing I made and tell me it's good",
      "here's something you'll skim for 30 seconds",
      "approve this so I can move on with my life",
    ],
    category: "email",
  },
  {
    phrase: "on your end",
    variations: ["at your end", "from your side", "on your side"],
    translations: [
      "your problem, not mine",
      "whatever's happening over there (I don't wanna know)",
      "politely implying the issue is with YOU",
    ],
    category: "email",
  },
  {
    phrase: "all the best",
    variations: ["best wishes", "with best wishes", "wishing you all the best"],
    translations: [
      "bye forever (or until next email)",
      "generic sign-off because I ran out of ways to say bye",
      "corporate warmth that requires zero actual warmth",
    ],
    category: "email",
  },
  {
    phrase: "speak soon",
    variations: ["talk soon", "chat soon", "catch up soon"],
    translations: [
      "we will probably not speak soon",
      "a promise neither of us intends to keep",
      "see you never (or in the next meeting invite)",
    ],
    category: "email",
  },
  {
    phrase: "would it be possible",
    variations: ["is it possible to", "would you be able to", "might it be possible"],
    translations: [
      "do this thing I'm pretending is optional",
      "I'm asking nicely but it's not really a question",
      "please say yes, I've already told my boss you would",
    ],
    category: "email",
  },
  {
    phrase: "please be advised",
    variations: ["please be aware", "please be informed", "you are hereby advised"],
    translations: [
      "brace yourself, here comes the bad news",
      "legal made me say this",
      "formal warning disguised as polite language",
    ],
    category: "email",
  },
  {
    phrase: "I'll keep you posted",
    variations: ["will keep you updated", "I'll keep you in the loop", "will keep you informed"],
    translations: [
      "you'll hear from me when I remember (so probably never)",
      "I'm saying this so you stop asking",
      "filing this under 'things I'll forget to do'",
    ],
    category: "email",
  },
  {
    phrase: "I just wanted to",
    variations: ["just wanted to", "I just wanted to quickly"],
    translations: [
      "here comes a request disguised as something casual",
      "downplaying what's actually a big ask",
      "softening the blow of what I'm about to dump on you",
    ],
    category: "email",
  },
  {
    phrase: "as always",
    variations: ["as ever", "as usual"],
    translations: [
      "nothing has changed and nothing ever will",
      "same old same old, but make it corporate",
      "filler words to make this email feel warmer",
    ],
    category: "email",
  },
  {
    phrase: "just a gentle reminder",
    variations: ["friendly reminder", "gentle nudge", "just a quick reminder", "a gentle reminder"],
    translations: [
      "this is NOT gentle, do the thing NOW",
      "I've reminded you before and I'm losing patience",
      "the reminder is gentle but my frustration is not",
    ],
    category: "email",
  },
  {
    phrase: "please see below",
    variations: ["see below for details", "details below", "as outlined below"],
    translations: [
      "scroll down, I'm not repeating myself",
      "the important stuff is down there, keep reading",
      "TL;DR is below because this email is way too long",
    ],
    category: "email",
  },
  {
    phrase: "your cooperation",
    variations: ["your cooperation is appreciated", "we appreciate your cooperation", "thank you for your cooperation"],
    translations: [
      "do what we say and don't complain",
      "compliance dressed up as teamwork",
      "you don't have a choice but we're pretending you do",
    ],
    category: "email",
  },
  {
    phrase: "time-sensitive",
    variations: ["this is time-sensitive", "time-critical", "urgent matter"],
    translations: [
      "DROP EVERYTHING AND DO THIS NOW",
      "someone procrastinated and now it's everyone's emergency",
      "artificial urgency to make you panic",
    ],
    category: "email",
  },
  {
    phrase: "to whom it may concern",
    variations: ["dear sir or madam", "dear hiring manager"],
    translations: [
      "I have no idea who I'm emailing",
      "couldn't be bothered to find out your name",
      "generic greeting from someone who's mass-emailing",
    ],
    category: "email",
  },
  {
    phrase: "further to",
    variations: ["further to our conversation", "further to my email", "further to your request"],
    translations: [
      "remember that thing? yeah, I'm bringing it up again",
      "building on that chat you probably forgot about",
      "continuing a thread you hoped was dead",
    ],
    category: "email",
  },
  {
    phrase: "with regards to",
    variations: ["in regards to", "in regard to", "regarding this matter"],
    translations: [
      "about (just say about)",
      "three words to say what one word could",
      "making 'about' sound important and official",
    ],
    category: "email",
  },
  {
    phrase: "take care",
    variations: ["take care of yourself", "look after yourself"],
    translations: [
      "bye but with a sprinkle of fake concern",
      "this email is over, please survive until the next one",
      "warmest possible way to end a corporate interaction",
    ],
    category: "email",
  },
  {
    phrase: "I'll follow up",
    variations: ["I will follow up on this", "I'll chase this up", "will follow up"],
    translations: [
      "I'm putting this on your calendar whether you like it or not",
      "expect another email about this soon",
      "this isn't over, I WILL be back",
    ],
    category: "email",
  },
  {
    phrase: "noted and understood",
    variations: ["understood", "understood, thank you", "received and understood"],
    translations: [
      "I read it. I get it. now leave me alone",
      "the most robotic acknowledgment possible",
      "message received, emotions not included",
    ],
    category: "email",
  },
  {
    phrase: "at your disposal",
    variations: ["I'm at your disposal", "available at your convenience", "available should you need"],
    translations: [
      "I'm technically available but please don't test that",
      "offering help I hope you won't take me up on",
      "corporate servant mode activated (reluctantly)",
    ],
    category: "email",
  },
  {
    phrase: "in the meantime",
    variations: ["in the interim", "meanwhile"],
    translations: [
      "while we wait for something to happen (it won't)",
      "during this awkward gap where nothing's moving",
      "here's busywork while the real problem remains unsolved",
    ],
    category: "email",
  },
  {
    phrase: "please confirm",
    variations: ["kindly confirm", "can you confirm", "could you please confirm"],
    translations: [
      "say yes so I can cover my butt",
      "I need a paper trail that you agreed to this",
      "reply so I have proof you saw this",
    ],
    category: "email",
  },

  // ── Meeting & Management (expansion) ──────────────────────
  {
    phrase: "in terms of",
    variations: ["from the standpoint of", "from the perspective of"],
    translations: [
      "about (but with extra filler words)",
      "let me add 3 unnecessary words to this sentence",
      "corporate padding to sound more thoughtful",
    ],
    category: "meeting",
  },
  {
    phrase: "heavy lifting",
    variations: ["heavy lift", "do the heavy lifting", "the heavy lifting"],
    translations: [
      "the hard work nobody wants to do",
      "the actual labor that everyone avoids",
      "the grunt work that won't fit on a slide deck",
    ],
    category: "management",
  },
  {
    phrase: "fire drill",
    variations: ["it's a fire drill", "another fire drill"],
    translations: [
      "fake emergency caused by poor planning",
      "someone panicked and now everyone has to sprint",
      "chaos because nobody planned ahead",
    ],
    category: "management",
  },
  {
    phrase: "sanity check",
    variations: ["gut check", "quick sanity check", "sense check"],
    translations: [
      "am I crazy or is this actually right?",
      "please validate my work because I don't trust myself",
      "double-check this before I embarrass myself",
    ],
    category: "meeting",
  },
  {
    phrase: "heads down",
    variations: ["heads-down mode", "in heads-down mode", "going heads down"],
    translations: [
      "don't talk to me, I'm actually working for once",
      "DND mode activated, leave me alone",
      "pretending to be busy (or actually being busy, rare)",
    ],
    category: "management",
  },
  {
    phrase: "rubber stamp",
    variations: ["rubber-stamp this", "rubber stamping", "rubber-stamped"],
    translations: [
      "approve this without actually reading it",
      "pretend to review it and just say yes",
      "the illusion of oversight",
    ],
    category: "management",
  },
  {
    phrase: "operationalize",
    variations: ["operationalizing", "operationalized"],
    translations: [
      "make it actually work (revolutionary, I know)",
      "turn the fancy plan into something real",
      "implement it, but make it sound way more important",
    ],
    category: "management",
  },
  {
    phrase: "productize",
    variations: ["productionize", "productized", "productizing"],
    translations: [
      "turn this janky prototype into something we can sell",
      "make it pretty enough for customers to pay for",
      "polish the demo into an actual product somehow",
    ],
    category: "tech",
  },
  {
    phrase: "seamless",
    variations: ["seamlessly", "seamless integration", "seamless experience"],
    translations: [
      "it definitely won't be seamless but we're promising it anyway",
      "smooth (but calling it 'smooth' isn't fancy enough)",
      "marketing's favorite word for 'it should work, maybe'",
    ],
    category: "general",
  },
  {
    phrase: "world-class",
    variations: ["world class", "truly world-class"],
    translations: [
      "average, but we're hyping it up",
      "definitely not world-class but the deck needs a buzzword",
      "the corporate equivalent of giving yourself a trophy",
    ],
    category: "general",
  },
  {
    phrase: "best-in-class",
    variations: ["best in class", "class-leading", "industry-leading"],
    translations: [
      "we googled the competition and think we're better",
      "self-awarded superlative with zero evidence",
      "marketing speak for 'we exist in this market'",
    ],
    category: "general",
  },
  {
    phrase: "state of the art",
    variations: ["state-of-the-art"],
    translations: [
      "new-ish, probably outdated by next quarter",
      "fancy tech that'll be legacy code in 2 years",
      "the most modern thing we could afford",
    ],
    category: "tech",
  },
  {
    phrase: "holistic",
    variations: ["holistic approach", "holistic view", "holistic solution", "holistically"],
    translations: [
      "looking at the whole mess instead of just one part",
      "considering everything (which means deciding nothing)",
      "vague enough to sound wise without committing to anything",
    ],
    category: "management",
  },
  {
    phrase: "pain point",
    variations: ["pain points", "customer pain points", "key pain points"],
    translations: [
      "the stuff that annoys people (groundbreaking insight)",
      "problems, but rebranded to sound empathetic",
      "things that suck, said in a way investors understand",
    ],
    category: "management",
  },
  {
    phrase: "playbook",
    variations: ["the playbook", "run the playbook", "from the playbook"],
    translations: [
      "the instructions nobody reads until things go wrong",
      "a document we made once and never updated",
      "the corporate recipe book of 'how we do things'",
    ],
    category: "management",
  },
  {
    phrase: "run it up the flagpole",
    variations: ["flag it up", "run this up the chain", "escalate this up"],
    translations: [
      "ask someone more important than me to decide",
      "passing the buck upward with patriotic imagery",
      "let's see if the bosses hate this idea too",
    ],
    category: "management",
  },
  {
    phrase: "fail fast",
    variations: ["fail fast learn fast", "fail forward"],
    translations: [
      "mess up quickly so we can mess up again",
      "speed-running mistakes and calling it innovation",
      "Silicon Valley's way of saying 'we have no plan'",
    ],
    category: "tech",
  },
  {
    phrase: "growth mindset",
    variations: ["adopt a growth mindset", "growth-oriented mindset"],
    translations: [
      "be positive about your problems (but we won't fix them)",
      "HR's favorite way to say 'stop complaining'",
      "believe you can grow (especially your workload)",
    ],
    category: "hr",
  },
  {
    phrase: "take ownership",
    variations: ["take ownership of", "own this", "owning this"],
    translations: [
      "this is your problem now, congratulations",
      "do the work AND take the blame if it fails",
      "responsibility without the authority or resources",
    ],
    category: "management",
  },
  {
    phrase: "sense of urgency",
    variations: ["with urgency", "create urgency", "a sense of urgency"],
    translations: [
      "PANIC but make it sound professional",
      "we're behind schedule and it's everyone's fault",
      "move faster even though we gave you no resources",
    ],
    category: "management",
  },
  {
    phrase: "on my radar",
    variations: ["on the radar", "it's on my radar", "not on my radar"],
    translations: [
      "I'm aware it exists but doing nothing about it",
      "I see the problem and am choosing to ignore it for now",
      "acknowledged but deprioritized to oblivion",
    ],
    category: "management",
  },
  {
    phrase: "devil's advocate",
    variations: ["play devil's advocate", "to play devil's advocate", "playing devil's advocate"],
    translations: [
      "I disagree but I'm blaming it on a hypothetical person",
      "let me argue against you while pretending it's not personal",
      "about to say something annoying but it's for 'debate'",
    ],
    category: "meeting",
  },
  {
    phrase: "due diligence",
    variations: ["do our due diligence", "proper due diligence"],
    translations: [
      "actually research this before we blow money on it",
      "the homework nobody wants to do but has to",
      "checking the receipts before committing",
    ],
    category: "management",
  },
  {
    phrase: "boots on the ground",
    variations: ["ground level", "ground-level view", "on the ground"],
    translations: [
      "the people actually doing the work while leadership theorizes",
      "real humans dealing with real problems (not in the boardroom)",
      "military metaphor for 'the interns are handling it'",
    ],
    category: "management",
  },
  {
    phrase: "forcing function",
    variations: ["use it as a forcing function", "acts as a forcing function"],
    translations: [
      "artificial deadline to make people actually do stuff",
      "manufactured pressure because normal motivation failed",
      "a fancy way to say 'deadline that forces your hand'",
    ],
    category: "management",
  },

  // ── General & Tech (expansion) ────────────────────────────
  {
    phrase: "learnings",
    variations: ["key learnings", "our learnings", "major learnings"],
    translations: [
      "things we learned (but 'learnings' isn't even a real word)",
      "mistakes rebranded as wisdom",
      "what we figured out after everything went wrong",
    ],
    category: "general",
  },
  {
    phrase: "at capacity",
    variations: ["at full capacity", "my plate is full", "stretched thin"],
    translations: [
      "I literally cannot take on one more thing",
      "one more task and I'm quitting",
      "drowning but making it sound like a resource allocation issue",
    ],
    category: "general",
  },
  {
    phrase: "double down",
    variations: ["doubling down", "doubled down on"],
    translations: [
      "doing MORE of the thing that may or may not be working",
      "refusing to change course out of stubbornness",
      "commitment, but make it sound like a casino strategy",
    ],
    category: "management",
  },
  {
    phrase: "full circle",
    variations: ["come full circle", "we've come full circle"],
    translations: [
      "we ended up where we started after wasting everyone's time",
      "the scenic route back to square one",
      "congratulations, nothing has changed",
    ],
    category: "general",
  },
  {
    phrase: "back to basics",
    variations: ["getting back to basics", "go back to basics"],
    translations: [
      "the fancy stuff failed so we're starting over",
      "turns out the simple approach was right all along",
      "pretending simplicity was the plan the whole time",
    ],
    category: "general",
  },
  {
    phrase: "flesh out",
    variations: ["flesh this out", "fleshing out", "needs fleshing out"],
    translations: [
      "this idea is half-baked, add more substance",
      "your proposal is a skeleton and it needs a body",
      "you wrote a bullet point and called it a plan",
    ],
    category: "meeting",
  },
  {
    phrase: "bake it in",
    variations: ["baked in", "bake this into", "baked into"],
    translations: [
      "include it from the start instead of bolting it on later",
      "make it part of the recipe, not a garnish",
      "add it properly instead of duct-taping it on",
    ],
    category: "tech",
  },
  {
    phrase: "give some color",
    variations: ["give us some color", "can you give color on", "add some color"],
    translations: [
      "explain this better because your explanation was beige",
      "make this less boring and more detailed",
      "your update was dry, spice it up with actual information",
    ],
    category: "meeting",
  },
  {
    phrase: "cascade",
    variations: ["cascade this down", "cascading information", "cascade to the team"],
    translations: [
      "pass the message down the chain like corporate telephone",
      "tell everyone below you what the bosses decided",
      "information waterfall that gets more distorted at every level",
    ],
    category: "management",
  },
  {
    phrase: "level up",
    variations: ["leveling up", "level-up", "level up our game"],
    translations: [
      "get better at stuff (like a video game but less fun)",
      "improve, but gamified to sound exciting",
      "do more work but call it personal growth",
    ],
    category: "general",
  },
  {
    phrase: "mission critical",
    variations: ["mission-critical", "business critical", "business-critical"],
    translations: [
      "if this breaks, we're ALL in trouble",
      "important enough that someone will get fired if it fails",
      "the thing keeping the lights on (literally or figuratively)",
    ],
    category: "management",
  },
  {
    phrase: "value proposition",
    variations: ["value prop", "our value proposition", "unique value proposition"],
    translations: [
      "why anyone should care about what we're selling",
      "the elevator pitch that took 47 meetings to write",
      "our reason to exist, condensed into marketing jargon",
    ],
    category: "management",
  },
  {
    phrase: "core competency",
    variations: ["core competencies", "key competencies", "core capabilities"],
    translations: [
      "the one thing we're actually good at",
      "our specialty (everything else is held together with tape)",
      "what we put on the slide when investors ask what we do",
    ],
    category: "management",
  },
  {
    phrase: "proactive",
    variations: ["proactively", "being proactive", "take a proactive approach"],
    translations: [
      "do stuff before it becomes an emergency (novel concept)",
      "the opposite of what we usually do",
      "acting before the fire starts instead of after (for once)",
    ],
    category: "general",
  },
  {
    phrase: "accountability",
    variations: ["hold accountable", "accountability partner", "personal accountability"],
    translations: [
      "whose fault is it (but said professionally)",
      "making sure someone specific gets blamed if this fails",
      "responsibility, but with more corporate weight behind it",
    ],
    category: "management",
  },
  {
    phrase: "dropped the ball",
    variations: ["dropping the ball", "don't drop the ball"],
    translations: [
      "someone messed up and everyone knows it",
      "the task fell through the cracks (aka nobody did it)",
      "fumbled the responsibility, now it's a whole thing",
    ],
    category: "general",
  },
  {
    phrase: "big picture",
    variations: ["the big picture", "big-picture thinking", "see the big picture"],
    translations: [
      "zoom out and ignore the details that are on fire",
      "strategic overview that conveniently skips the problems",
      "let's talk about vibes instead of specifics",
    ],
    category: "management",
  },
  {
    phrase: "open door policy",
    variations: ["my door is always open", "we have an open door policy"],
    translations: [
      "the door is open but nobody's actually welcome",
      "technically you can come in, but you'll regret it",
      "corporate illusion of approachability",
    ],
    category: "hr",
  },
  {
    phrase: "net positive",
    variations: ["net positive impact", "overall net positive"],
    translations: [
      "the good slightly outweighs the bad (we think)",
      "it's fine if you squint and ignore the downsides",
      "positive after subtracting all the stuff that went wrong",
    ],
    category: "general",
  },
  {
    phrase: "tiger team",
    variations: ["assemble a tiger team", "put a tiger team on this"],
    translations: [
      "an elite squad of people pulled from other work to fix this mess",
      "the Avengers but for corporate emergencies",
      "a cool name for 'everyone drop everything and save us'",
    ],
    category: "management",
  },

  // ── HR (expansion) ────────────────────────────────────────
  {
    phrase: "stretch role",
    variations: ["stretch assignment", "stretch opportunity", "stretch goal"],
    translations: [
      "a job that's way above your pay grade but they won't promote you",
      "extra challenge with no extra compensation",
      "'growth opportunity' that's actually just more stress",
    ],
    category: "hr",
  },
  {
    phrase: "bench strength",
    variations: ["leadership bench", "building bench strength"],
    translations: [
      "backup people in case the main people quit",
      "the corporate equivalent of having substitutes ready",
      "how deep is our talent pool (spoiler: not very)",
    ],
    category: "hr",
  },
  {
    phrase: "psychological safety",
    variations: ["psychologically safe environment", "safe space to share"],
    translations: [
      "you can speak up without getting fired (allegedly)",
      "it's safe to disagree (results may vary)",
      "HR buzzword for 'please don't sue us for hostile work environment'",
    ],
    category: "hr",
  },
  {
    phrase: "culture add",
    variations: ["culture contribution", "adding to our culture"],
    translations: [
      "you bring something different (we realized 'culture fit' was problematic)",
      "the rebrand of 'culture fit' after the DEI training",
      "you're not like us and that's apparently good now",
    ],
    category: "hr",
  },
  {
    phrase: "golden parachute",
    variations: ["executive severance", "separation package"],
    translations: [
      "getting paid millions to leave after messing everything up",
      "failing upward with a fat check on the way out",
      "the ultimate 'it's not you, it's us' but with a pile of cash",
    ],
    category: "hr",
  },
];
