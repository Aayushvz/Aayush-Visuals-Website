/*
  Single source of truth for the Projects section. Adding a future project =
  append one object here. Every project also gets a full case-study page at
  /work/[id] (see components/projects/figma/FigmaProjectPage), rendered off
  this same array. `preview` is a tagged union so that page's CTA link can
  point at a live site, Behance, an image/video, or a local route without
  touching component code.

  `cover` and `logoText` are placeholders — real transparent PNG/SVG logos
  and cover photography will be dropped in later (see notes on ProjectTile).
*/

export type ProjectPreview =
  | { kind: "behance"; embedId: string; href: string }
  | { kind: "website"; href: string; image?: string }
  | { kind: "image"; src: string; href?: string }
  | { kind: "video"; src: string; poster?: string; href?: string }
  | { kind: "page"; href: string }; // future: local case-study route

type ShotBase = {
  /** shown under the image on the case-study page */
  caption: string;
  /** screen-reader description of what the image actually shows */
  alt: string;
  /** full-bleed within the column; non-wide shots sit inset for rhythm */
  wide?: boolean;
  /* A single phone screen. Even the inset width renders a 9:19 export at
     ~720px across, which is a phone the size of a television. Constrains the
     frame to something a phone is actually shaped like. */
  narrow?: boolean;
};

/*
  A shot is either one image, or a tall export sliced into stacked pieces.

  The strip form exists because WebP tops out at 16383px per side: a 22,306px
  case-study export physically cannot be one file, and a bitmap that tall
  would be ~125MB of RGBA to decode on the main thread even if it could. The
  slices carry their own dimensions so the page can reserve the exact box for
  each before it loads and not twitch as 18 images arrive.
*/
export type ProjectShot =
  | (ShotBase & { src: string })
  | (ShotBase & {
      strip: string[];
      sliceW: number;
      sliceH: number;
      /** the export rarely divides evenly, so the final piece is shorter */
      lastSliceH: number;
    });

export function isStripShot(
  shot: ProjectShot
): shot is ShotBase & { strip: string[]; sliceW: number; sliceH: number; lastSliceH: number } {
  return "strip" in shot;
}

/*
  Long-form case study content.

  `shots` alone gives a gallery: frames and captions, no argument. A project
  that needs to show how it got built needs prose between the frames, so
  `sections` exists as the richer body. When a project has sections they
  replace the flat gallery entirely — its figures live inside the sections
  they belong to, which is the whole point, and the images stop being a
  separate stack at the bottom of the page.

  Each section is one named frame on the canvas and one row in the Layers
  tree, so the sidebar doubles as the case study's table of contents without
  anything extra being wired up.
*/
export type CaseBlock =
  /* running text; one string per paragraph */
  | { kind: "prose"; body: string[] }
  /* 01/02/03 rows — problems, decisions, findings. The number is generated
     from position, so reordering the array can't leave a stale label. */
  | { kind: "numbered"; items: { label: string; body: string }[] }
  /* the figures that carry weight on their own: market size, screen counts */
  | { kind: "stats"; items: { value: string; label: string }[] }
  /* one line, full width, nothing else on screen with it */
  | { kind: "statement"; text: string }
  | { kind: "figure"; shot: ProjectShot }
  /* a row of frames that only mean anything in sequence — phone screens
     stepping through a flow. Shown as fixed-height windows onto the top of
     each screen: at their real 1:3.9 ratio, four of them side by side would
     be a 950px-tall band nobody scrolls past. */
  | {
      kind: "gallery";
      items: { src: string; alt: string; label?: string }[];
      caption?: string;
    }
  /* two desktop screens side by side, uncropped. A surface with a dozen
     screens can't give every one of them a full-width frame or the section
     turns into a scroll endurance test; the primary screen gets the full
     width and the supporting ones pair up. */
  | {
      kind: "grid";
      items: { src: string; alt: string; label?: string }[];
      caption?: string;
    }
  /* design-system rows. `swatch` paints a colour chip beside the value. */
  | { kind: "specs"; items: { name: string; value: string; note?: string; swatch?: string }[] }
  /* A user flow, drawn here rather than screenshotted from the design file.
     A working flow board is dense, half-abandoned and full of notes to
     yourself; it is evidence that thinking happened, not something a reader
     can follow. This redraws the conclusion: the steps that survived, in
     order, with what each one decides. */
  | {
      kind: "flow";
      steps: {
        label: string;
        /* what the step actually resolves, one short line each */
        sub?: string[];
        /* renders as the branch point rather than a plain step */
        decision?: boolean;
      }[];
      caption?: string;
    }
  /*
    Two paths side by side, before and after. Where `flow` describes one
    journey, this argues: the reader sees the shape of the difference (eight
    steps against two) before reading a single label, which is the whole
    point of a redesign that removes work rather than rearranging it.
  */
  | {
      kind: "compare";
      lanes: {
        label: string;
        note?: string;
        /* the losing lane is dimmed and struck, the winning one is accented */
        tone: "before" | "after";
        steps: string[];
      }[];
      caption?: string;
    }
  /*
    Research, drawn rather than screenshotted. A slide exported from the
    deck it was presented in reads as evidence somebody else made; the same
    number rebuilt as a component reads as an argument this page is making.
  */
  | {
      kind: "bars";
      items: { label: string; value: number; display: string; tone?: "bad" | "good" }[];
      caption?: string;
    }
  /*
    "N of TOTAL", as a grid of cells with N lit. For quantities where the
    ratio is the point and the number alone hides it: two supported
    languages out of twenty-two is a sentence, but twenty dark cells is an
    argument.
  */
  | {
      kind: "coverage";
      total: number;
      filled: number;
      label: string;
      note?: string;
    }
  /*
    A screen with a real explanation rather than a caption. Thirty frames
    under one-line captions is a scroll; thirty frames each carrying a step
    number, a title and a paragraph is a walkthrough.
  */
  | {
      kind: "screens";
      items: { src: string; alt: string; step: string; title: string; body: string }[];
    }
  /*
    Low-fidelity layouts, drawn in CSS rather than exported.

    Wireframes are the one artefact that almost never survives a project:
    they get thrown away the moment the visual design starts. Redrawing them
    at low fidelity is honest about that and is also better than a
    screenshot would be, because greyboxes show the structural decision
    without the palette arguing over it.

    `layout` selects a hand-built arrangement in the renderer; there is no
    point encoding box coordinates in data nobody will hand-edit.
  */
  | {
      kind: "wireframes";
      items: { layout: "entry" | "listen" | "chat" | "review"; label: string; note: string }[];
      caption?: string;
    };

export type ProjectSection = {
  /** the Layers-tree row and the frame label above the section on canvas */
  name: string;
  /** the section's visible heading; omit for a frame that runs on unlabelled */
  heading?: string;
  blocks: CaseBlock[];
};

export type Project = {
  id: string;
  /* Long-form process work is listed in its own section on /work rather than
     the Projects grid. Kept as a flag on the one array instead of a second
     parallel list, so the two can't drift and /work/[slug], the sitemap and
     the file-page dock all keep working with no extra wiring. */
  kind?: "project" | "case-study";
  /* Lists the project in Case Studies *without* taking it out of the Projects
     grid. `kind: "case-study"` moves a project between the two; this copies
     it, for work that is both a shipped product and a long-form deep dive. */
  alsoCaseStudy?: boolean;
  title: string;
  /** short wordmark shown on the tile until a real logo asset lands */
  logoText: string;
  logoUrl?: string;
  bgVideoUrl?: string;
  category: string;
  year: string;
  /** placeholder cover photo — swap for real artwork later */
  cover: string;
  preview: ProjectPreview;
  /** label for the modal's primary action button */
  cta: string;
  role: string;
  tools: string[];
  description: string;
  highlights: string[];
  /** project-specific facts appended after Role/Category/Year on the
      case-study page (e.g. Surfaces, Airports) */
  extraFacts?: [string, string][];
  /** case-study gallery. Without it the page falls back to `cover` alone. */
  shots?: ProjectShot[];
  /** long-form body. When present it renders instead of the flat `shots`
      gallery — see CaseBlock above. */
  sections?: ProjectSection[];
  /*
    Overrides the case-study accent for this project only, so a piece of
    work can be read in its own brand colour instead of the site purple.
    Two values because one hue almost never clears 4.5:1 on both a #1e1e1e
    and a #ffffff canvas — the light entry is normally a darker shade of
    the same hue.
  */
  accent?: { dark: string; light: string };
};

export const PROJECTS: Project[] = [
  {
    id: "mike-tyson-invitational",
    title: "Mike Tyson Invitational",
    logoText: "MTI",
    logoUrl: "/projects/mike-tyson-logo.webp",
    bgVideoUrl: "/projects/mike-tyson-bg.webp",
    category: "Website Design",
    year: "2026",
    cover: "/projects/mike-tyson-bg.webp",
    preview: {
      kind: "website",
      href: "https://mike-tyson-invitational.webflow.io",
      image: "/projects/mike-tyson-bg.webp",
    },
    cta: "Visit Live Website",
    role: "Design & Build",
    tools: ["Webflow", "Figma", "Motion"],
    description:
      "A high-impact tournament site for the Mike Tyson Invitational, built for momentum, clarity and a heavyweight first impression.",
    highlights: [
      "Countdown-driven landing built around a hard launch deadline",
      "Custom Webflow interactions tuned for mobile performance",
      "Ticketing flow simplified into a single frictionless path",
    ],
  },
  {
    id: "elevation-capital",
    title: "Elevation Capital",
    logoText: "ELEVATION",
    logoUrl: "/logos/elevation-capital.webp",
    category: "Website Development",
    year: "2025",
    cover: "/projects/elevation-ai-cover.webp",
    preview: {
      kind: "website",
      href: "https://stateofaiadoption.elevationcapital.com/",
      image: "/projects/elevation-ai-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Website Development",
    tools: ["Framer", "Figma", "AI"],
    description:
      "Elevation Capital’s The State of AI Adoption in Indian Startups report reveals that 86% of startup founders plan to increase AI spending, 85% of engineering teams have moved AI into production, and productivity has become the primary proving ground.",
    highlights: [
      "Interactive report detailing AI adoption across 86% of Indian startup founders",
      "Developed natively on Framer with dynamic data visualizations and smooth motion",
      "Highlighting engineering teams moving AI into production and driving productivity",
    ],
  },
  {
    id: "riviera",
    title: "Riviera",
    logoText: "RIVIERA",
    logoUrl: "/projects/riviera-logo.webp",
    category: "Website Design",
    year: "2026",
    cover: "/projects/riviera-cover.webp",
    preview: {
      kind: "website",
      href: "https://riviera.vit.ac.in/",
      image: "/projects/riviera-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["Framer", "Figma", "Motion"],
    description:
      "Website design for Riviera, one of the country's largest student fests, built to carry the scale and energy of the event.",
    highlights: [
      "Website built to carry one of the country's largest student fests",
      "Motion-forward homepage designed to signal scale and energy",
      "Content architecture built for dozens of events and sub-brands",
    ],
  },
  {
    id: "cpgrams",
    /* a shipped government product and a full deep dive, so it belongs in both */
    alsoCaseStudy: true,
    /* the product's own saffron. #FE6700 clears 4.5:1 on the dark canvas but
       only manages 3.2:1 on white, so light mode drops to a deeper shade of
       the same hue rather than tinting the whole page. */
    accent: { dark: "#FE6700", light: "#C2410C" },
    title: "CPGRAMS",
    logoText: "CPGRAMS",
    category: "Product Design",
    year: "2026",
    cover: "/projects/cpgrams-cover.webp",
    preview: { kind: "website", href: "https://cpgramsaichatbot.com/", image: "/projects/cpgrams-cover.webp" },
    cta: "Visit Live Chatbot",
    role: "Product Design · Conversational UX",
    tools: ["Figma", "Conversational UX", "Prototyping"],
    description:
      "CPGRAMS is how a citizen of India formally complains to their own government. It handles over 20 lakh grievances a year across 90+ ministries, and until now it did it through a 15-field form in English or Hindi. This is a conversational layer over that system: you speak your problem in your own language, and a chatbot turns it into a correctly routed, correctly categorised grievance without you ever seeing the form.",
    extraFacts: [
      ["Client", "DARPG, Government of India"],
      ["Delivered with", "KPMG India"],
      ["Languages", "22 scheduled Indian languages"],
      ["Scope", "Conversational architecture, voice UX, UI, mascot, design system"],
      ["Surfaces", "Web chatbot, mobile web"],
      ["Live at", "cpgramsaichatbot.com"],
    ],
    highlights: [
      "Speech-to-text intake in 22 languages, so filing needs no reading or writing",
      "Grievances auto-filled and routed to the correct ministry from plain speech",
      "Samadhan Didi, a lip-synced mascot who teaches the interface as you use it",
    ],
    sections: [
      {
        name: "the system",
        heading: "A promise the state already makes",
        blocks: [
          {
            kind: "prose",
            body: [
              "Most products begin by inventing a reason to exist. This one did not. CPGRAMS is already a constitutional-grade commitment: any citizen of India can lodge a grievance against any central government department, and an officer is obliged to answer it, usually inside 30 to 60 days, with automatic escalation to senior officers and a route to the Prime Minister's Office if they do not.",
              "It is not a pilot or a portal somebody is trying to get adopted. It runs across more than 90 ministries and handles over 20 lakh grievances a year, and it disposes of 93% of them. The machinery works.",
              "So this project was never about designing a service. The service exists. It was about the fact that the door into it could only be opened by people who least needed it.",
            ],
          },
          {
            kind: "stats",
            items: [
              { value: "20L+", label: "grievances filed every year" },
              { value: "90+", label: "central ministries and departments covered" },
              { value: "30-60", label: "days an officer has to respond, by mandate" },
            ],
          },
        ],
      },
      {
        name: "the door",
        heading: "The door",
        blocks: [
          {
            kind: "prose",
            body: [
              "To use that machinery, a citizen has to fill in a form. One page, fifteen or more fields, written in departmental language, on a layout built for a desktop computer.",
              "The hardest field is the second one. Before describing anything, you must name the ministry and the category your problem belongs to. That is a filing decision. Ask a person whose pension has stopped which of ninety departments owns that, and the conversation is already over.",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "You must already know the answer to use it",
                body: "Ministry and category are required before the complaint is written. The people most in need of the system are least able to classify their own problem inside it.",
              },
              {
                label: "Built for a machine most users do not own",
                body: "Desktop-first, in a country where roughly three quarters of internet users are mobile-first. Small targets, dense text, and a CAPTCHA that defeats exactly the age group filing the most grievances.",
              },
              {
                label: "Two languages out of twenty-two",
                body: "English and Hindi only. More than 550 million citizens communicate in a regional language and the portal has nothing to say to any of them.",
              },
              {
                label: "One mistake and the work is gone",
                body: "Session timeouts wipe everything entered. No autosave, no drafts, no recovery path, and error messages that explain nothing.",
              },
            ],
          },
          {
            kind: "bars",
            items: [
              { label: "Abandon the grievance form partway through", value: 60, display: "60%", tone: "bad" },
              { label: "Find government websites confusing to navigate", value: 52, display: "52%", tone: "bad" },
              { label: "Of rural India uses the internet regularly", value: 31, display: "31%", tone: "bad" },
            ],
            caption:
              "Three numbers from the audit, and the first one is the whole indictment. Six in ten people who start a grievance never finish it, which means the state never hears from them at all.",
          },
        ],
      },
      {
        name: "who it serves",
        heading: "Who it actually serves",
        blocks: [
          {
            kind: "coverage",
            total: 22,
            filled: 2,
            label: "scheduled Indian languages supported by the portal",
            note: "English and Hindi. Every other cell is a language the Constitution recognises and the interface does not.",
          },
          {
            kind: "prose",
            body: [
              "Language is the clearest exclusion but not the only one. A quarter of the country cannot read or write at all, which makes any text interface a closed door regardless of which language it is written in. The 60-plus age group files the most grievances and has the lowest digital literacy, so their complaints get filed by somebody else, or filtered, or delayed, or never made.",
              "Put those together and 78% of grievances arrive from urban, educated users.",
            ],
          },
          {
            kind: "statement",
            text: "A channel built for 1.4 billion people was, in practice, being used by the top 15%.",
          },
          {
            kind: "prose",
            body: [
              "That is not a usability score. It is a democratic problem. The feedback loop between a government and its citizens was quietly sampling only the citizens who were already doing fine.",
            ],
          },
        ],
      },
      {
        name: "insight",
        blocks: [
          {
            kind: "statement",
            text: "People were not failing to file grievances. They were failing to fill in a form. Only one of those is the citizen's problem.",
          },
          {
            kind: "prose",
            body: [
              "That reframe is the entire project. It moves the work from redesigning the portal to building a translation layer over it.",
              "Nothing about the government changes. Same ministries, same categories, same statutory clock. What changes is who is required to understand any of it. The citizen describes what happened to them, in whatever language they think in, out loud if they cannot write. The system does the filing.",
            ],
          },
          {
            kind: "compare",
            lanes: [
              {
                label: "The portal asks the citizen to",
                tone: "before",
                note: "Every step is a chance to give up, and six in ten people take it.",
                steps: [
                  "Register an account",
                  "Read the interface in English or Hindi",
                  "Identify the correct ministry",
                  "Identify the correct category",
                  "Write the grievance in formal language",
                  "Attach the right documents",
                  "Clear a CAPTCHA",
                  "Complete it all before the session expires",
                ],
              },
              {
                label: "The chatbot asks the citizen to",
                tone: "after",
                note: "Everything else is inferred, filled and routed by the system that already knows how it is organised.",
                steps: ["Say what happened", "Check that it got it right"],
              },
            ],
            caption:
              "The same grievance, the same destination, the same legal weight. The difference is who carries the knowledge of how government is organised, and the redesign moves that from the citizen to the software.",
          },
        ],
      },
      {
        name: "thought process",
        heading: "How I approached it",
        blocks: [
          {
            kind: "prose",
            body: [
              "Two constraints shaped every decision. The government's taxonomy could not change, and the audience could not be assumed to read.",
              "That rules out the obvious move. A cleaner form is still a form, and a form is a reading test with a filing test attached. So the work became conversational architecture: decide what the system infers, what it asks, and what it must show before acting.",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "Move the cognitive load, do not reduce it",
                body: "The complexity is real and cannot be deleted. It can only be carried by the software instead of the citizen.",
              },
              {
                label: "Progressive disclosure over a single page",
                body: "Fifteen fields at once is the failure. One question at a time keeps working memory free for the answer.",
              },
              {
                label: "Input parity, output parity",
                body: "Accepting voice but replying only in text solves the wrong half. Every response is playable.",
              },
              {
                label: "Automation needs a consent surface",
                body: "The system files on the citizen's behalf, so it has to show its interpretation before committing.",
              },
            ],
          },
        ],
      },
      {
        name: "ideation",
        heading: "What got explored",
        blocks: [
          {
            kind: "prose",
            body: [
              "Three directions were considered before the conversational one won.",
            ],
          },
          {
            kind: "compare",
            lanes: [
              {
                label: "Rejected",
                tone: "before",
                note: "Each fixes the surface and leaves the barrier standing.",
                steps: [
                  "Redesign the form: cleaner, still a reading and filing test",
                  "Add a language toggle: a picker is itself a reading test",
                  "Build a native app: an install barrier for 2G users",
                ],
              },
              {
                label: "Chosen",
                tone: "after",
                note: "Removes the two things that actually stop people.",
                steps: [
                  "Conversation over the existing system",
                  "Voice as the primary input, not a feature",
                ],
              },
            ],
          },
        ],
      },
      {
        name: "wireframing",
        heading: "Structure before surface",
        blocks: [
          {
            kind: "prose",
            body: [
              "You do not wireframe a chatbot the way you wireframe a page. There is no fixed layout to arrange, only a sequence of states and what each one is allowed to ask for.",
              "Four greyboxes settled the structure: where the primary control sits, how the system proves it is listening, how the thread reads, and what the last screen before submission has to contain.",
            ],
          },
          {
            kind: "wireframes",
            items: [
              {
                layout: "entry",
                label: "01 Entry",
                note: "One primary action, centred. History rail kept from the portal so returning users recognise it.",
              },
              {
                layout: "listen",
                label: "02 Capture",
                note: "Live feedback while recording. A static indicator does not reassure a first-time user.",
              },
              {
                layout: "chat",
                label: "03 Thread",
                note: "Alternating turns, input pinned. Every message persists so a dropped session is not a lost grievance.",
              },
              {
                layout: "review",
                label: "04 Review",
                note: "Interpretation, detected tag, primary and secondary action. The consent surface.",
              },
            ],
            caption:
              "Redrawn at low fidelity. Greyboxes keep the argument on structure, which is the only thing these were ever deciding.",
          },
        ],
      },
      {
        name: "principle",
        blocks: [
          {
            kind: "statement",
            text: "My main target was to design this in such a way that each page solves a problem with the minimum number of clicks.",
          },
        ],
      },
      {
        name: "samadhan didi",
        heading: "Samadhan Didi",
        blocks: [
          {
            kind: "prose",
            body: [
              "A chat window is still an interface, and to somebody who has never used one it is still an exam. So the product has a face.",
              "Samadhan Didi is a government worker in a saree with a departmental lanyard. Didi means elder sister: the person you already ask for help with a form. She is lip-synced to the spoken reply, so the answer is watched as well as heard.",
            ],
          },
          {
            kind: "gallery",
            items: [
              { src: "/projects/cpgrams/mascot-v1.webp", label: "Direction 1", alt: "An early mascot exploration for CPGRAMS." },
              { src: "/projects/cpgrams/mascot-v2.webp", label: "Direction 2", alt: "A second early mascot exploration for CPGRAMS." },
              { src: "/projects/cpgrams/mascot-v3.webp", label: "Direction 3", alt: "A third early mascot exploration for CPGRAMS." },
              { src: "/projects/cpgrams/mascot-v4.webp", label: "Direction 4", alt: "A fourth early mascot exploration for CPGRAMS." },
            ],
            caption:
              "Four directions before the character settled. The test each one had to pass: would a first-time filer read her as staff who works here, or as a brand character?",
          },
          {
            kind: "gallery",
            items: [
              { src: "/projects/cpgrams/mascot-a.webp", label: "Greeting", alt: "Samadhan Didi in a greeting pose." },
              { src: "/projects/cpgrams/mascot-b.webp", label: "Explaining", alt: "Samadhan Didi in an explaining pose." },
              { src: "/projects/cpgrams/mascot-c.webp", label: "Pointing", alt: "Samadhan Didi pointing at an interface control." },
              { src: "/projects/cpgrams/mascot-d.webp", label: "Listening", alt: "Samadhan Didi in a listening pose." },
              { src: "/projects/cpgrams/mascot-e.webp", label: "Reassuring", alt: "Samadhan Didi in a reassuring pose." },
              { src: "/projects/cpgrams/mascot-f.webp", label: "Confirming", alt: "Samadhan Didi in a confirming pose." },
              { src: "/projects/cpgrams/mascot-g.webp", label: "Closing", alt: "Samadhan Didi in a closing pose." },
            ],
            caption:
              "The shipped set. Built as states, not one illustration: a guide holding a single expression through a complaint about a missing pension reads as indifferent.",
          },
        ],
      },
      {
        name: "demo",
        heading: "First run: teaching the interface",
        blocks: [
          {
            kind: "prose",
            body: [
              "This is the flow a citizen sees once, the first time they ever open the chatbot, and it carries more weight than anything else in the product. Everything after it assumes the person knows they can press a button and speak. Nothing in their experience of government websites has ever suggested that.",
              "So the tutorial does not describe the interface. It points at it. The screen dims except the one control being discussed, Samadhan Didi stands beside it and says what it does in plain language, and the whole thing can be skipped from the first frame by anyone who does not need it.",
            ],
          },
          {
            kind: "screens",
            items: [
              {
                src: "/projects/cpgrams/demo-01.webp",
                step: "Demo 01",
                title: "Arriving with nothing to read",
                body: "No account, no install. Two ways forward on screen, speaking or typing, instead of a login wall. The rural illustration signals the intended user before a word is read.",
                alt: "The CPGRAMS chatbot opening screen with a welcome message and the option to register a grievance by speaking or typing.",
              },
              {
                src: "/projects/cpgrams/demo-02.webp",
                step: "Demo 02",
                title: "The guide introduces herself",
                body: "The guide is established before she gives instructions. Coming from a recognisable government figure, the tutorial reads as help rather than a test.",
                alt: "Samadhan Didi introduced at full height beside the CPGRAMS chatbot interface.",
              },
              {
                src: "/projects/cpgrams/demo-03.webp",
                step: "Demo 03",
                title: "Spotlight on one control at a time",
                body: "Spotlight masking: one control lit at a time, so the instruction can never point ambiguously. This is why the tutorial stays short.",
                alt: "The CPGRAMS chatbot with the interface dimmed and a single control spotlit during the tutorial.",
              },
              {
                src: "/projects/cpgrams/demo-04.webp",
                step: "Demo 04",
                title: "The microphone, explained in one sentence",
                body: "The primary control gets the plainest instruction. No mention of transcription or accuracy: the promise stays small enough to be believed.",
                alt: "The CPGRAMS chatbot tutorial spotlighting the microphone with Samadhan Didi explaining to press it and share concerns in a preferred language.",
              },
              {
                src: "/projects/cpgrams/demo-05.webp",
                step: "Demo 05",
                title: "Handing over, with an exit",
                body: "Skip is available from frame one, not just at the end. Onboarding should never tax the confident user to help the uncertain one.",
                alt: "The final tutorial screen of the CPGRAMS chatbot with a skip tutorial control visible.",
              },
            ],
          },
          {
            kind: "gallery",
            items: [
              { src: "/projects/cpgrams/m-demo-1.webp", label: "Open", alt: "The CPGRAMS chatbot onboarding on a phone, opening state." },
              { src: "/projects/cpgrams/m-demo-2.webp", label: "Meet", alt: "Samadhan Didi introduced on a phone screen." },
              { src: "/projects/cpgrams/m-demo-3.webp", label: "Spotlight", alt: "The phone tutorial dimming the screen around one control." },
              { src: "/projects/cpgrams/m-demo-4.webp", label: "Microphone", alt: "The phone tutorial spotlighting the microphone button." },
              { src: "/projects/cpgrams/m-demo-5.webp", label: "Hand over", alt: "The final phone tutorial screen with a skip control." },
            ],
            caption:
              "The same five beats at 402px. On a phone the mascot drops to a corner presence rather than a full figure, because at this width she would otherwise cover the control she is pointing at.",
          },
        ],
      },
      {
        name: "voice flow",
        heading: "Voice: the path for people who cannot type",
        blocks: [
          {
            kind: "prose",
            body: [
              "For a quarter of the country, reading and writing is the barrier. Voice is not a convenience feature layered on top of this product. It is the accessibility strategy, and the typed flow is the alternative rather than the default.",
              "Press once, speak, and the system does the rest. Speech-to-text runs through Bhashini across all 22 scheduled languages, the language is detected rather than selected, and the reply comes back spoken as well as written. Filing a grievance becomes about as difficult as making a phone call, which for this audience is the correct level of difficulty.",
            ],
          },
          {
            kind: "screens",
            items: [
              {
                src: "/projects/cpgrams/voice-01.webp",
                step: "Voice 01",
                title: "One obvious thing to do",
                body: "One primary affordance, centred and weighted. No language picker or category dropdown, because each is a decision demanded before the citizen has said anything.",
                alt: "The CPGRAMS voice flow resting state with a large central microphone control.",
              },
              {
                src: "/projects/cpgrams/voice-02.webp",
                step: "Voice 02",
                title: "Press to speak",
                body: "Single press, not press-and-hold. Hold gestures fail for tremor and arthritis, and the 60-plus group files the most grievances here.",
                alt: "The CPGRAMS voice flow with a press to speak prompt on the microphone.",
              },
              {
                src: "/projects/cpgrams/voice-03.webp",
                step: "Voice 03",
                title: "Proof that it is listening",
                body: "A live waveform, not a static indicator. Without real-time system feedback, an unsure user stops mid-sentence to check it is working.",
                alt: "The CPGRAMS voice flow recording with a live waveform responding to speech.",
              },
              {
                src: "/projects/cpgrams/voice-04.webp",
                step: "Voice 04",
                title: "Their words, kept",
                body: "The audio persists in the thread rather than being converted and discarded. The citizen can replay exactly what the system is about to act on.",
                alt: "A user voice message in the CPGRAMS chat thread with a waveform audio player.",
              },
              {
                src: "/projects/cpgrams/voice-05.webp",
                step: "Voice 05",
                title: "Transcription, shown not hidden",
                body: "Transcription shown next to the audio. First point of error recovery, and far cheaper than catching a misheard place name after routing.",
                alt: "The CPGRAMS voice flow showing the transcribed text alongside the recorded audio.",
              },
              {
                src: "/projects/cpgrams/voice-06.webp",
                step: "Voice 06",
                title: "Language detected, not requested",
                body: "Language detected, not selected. A picker is a reading test given to people who may not read, and the same trap as the ministry dropdown.",
                alt: "The CPGRAMS voice flow with a detected regional language reflected in the interface.",
              },
              {
                src: "/projects/cpgrams/voice-07.webp",
                step: "Voice 07",
                title: "Answered out loud",
                body: "Output parity with input. Voice in, text-only out abandons the user at the reply, which is the half carrying the answer.",
                alt: "Samadhan Didi responding in the CPGRAMS chat with both written text and a voice response player.",
              },
              {
                src: "/projects/cpgrams/voice-08.webp",
                step: "Voice 08",
                title: "Filling the gaps by asking, one at a time",
                body: "Progressive disclosure. The fifteen-field form broken into single questions, asked only where a human answer is genuinely required.",
                alt: "The CPGRAMS chatbot asking a single follow-up question to complete a grievance.",
              },
              {
                src: "/projects/cpgrams/voice-09.webp",
                step: "Voice 09",
                title: "The form, filled without being seen",
                body: "Ministry, category, location and urgency inferred from speech. The dropdown that stops most people at the portal never appears.",
                alt: "The CPGRAMS chatbot with an auto-filled grievance derived from the spoken complaint.",
              },
              {
                src: "/projects/cpgrams/voice-10.webp",
                step: "Voice 10",
                title: "Read back before it counts",
                body: "The consent surface. Interpretation, detected state and category shown before anything is committed, because auto-filing a legal document unseen is a liability with the citizen's name on it.",
                alt: "The CPGRAMS pre-submission review card showing the interpreted grievance, a detected state tag and a submit control.",
              },
              {
                src: "/projects/cpgrams/voice-11.webp",
                step: "Voice 11",
                title: "A way out when the routing is wrong",
                body: "One-tap escalation when routing is wrong. The system is allowed to be wrong; it is not allowed to be wrong with no exit.",
                alt: "The CPGRAMS review card with a link to register with the Central Authority if the state categorisation is incorrect.",
              },
              {
                src: "/projects/cpgrams/voice-12.webp",
                step: "Voice 12",
                title: "Submitted, and traceable",
                body: "The registration ID starts the statutory clock and is the only thing worth keeping, so it persists in the thread rather than a dismissible toast.",
                alt: "The CPGRAMS chatbot confirming a submitted grievance with a registration identifier.",
              },
            ],
          },
          {
            kind: "gallery",
            items: [
              { src: "/projects/cpgrams/m-voice-1.webp", label: "Rest", alt: "CPGRAMS voice flow resting state on a phone." },
              { src: "/projects/cpgrams/m-voice-3.webp", label: "Listening", alt: "CPGRAMS voice recording on a phone with a live waveform." },
              { src: "/projects/cpgrams/m-voice-5.webp", label: "Transcribed", alt: "CPGRAMS phone screen showing transcribed speech." },
              { src: "/projects/cpgrams/m-voice-7.webp", label: "Answered", alt: "CPGRAMS phone screen with a spoken response player." },
              { src: "/projects/cpgrams/m-voice-9.webp", label: "Review", alt: "CPGRAMS review screen on a phone before submission." },
              { src: "/projects/cpgrams/m-voice-10.webp", label: "Submitted", alt: "CPGRAMS phone confirmation screen with a registration identifier." },
            ],
            caption:
              "Voice matters more on the phone, not less. This is the device the low-literacy user actually owns, often on 2G or 3G, so the microphone stays in thumb reach and the review card takes the full screen rather than sitting below a fold.",
          },
        ],
      },
      {
        name: "text flow",
        heading: "Text: the same architecture, typed",
        blocks: [
          {
            kind: "prose",
            body: [
              "Voice is the priority, not the requirement. Plenty of citizens can type and would rather, and speaking a complaint out loud is not always possible in a shared house, an office, or a queue.",
              "The typed path reaches the same destination through the same architecture. Describe it in plain language, let the system infer the classification, review before submitting. It is a conversation, never a form, and the difference from the portal is that the burden of knowing how government is organised never moves onto the person typing.",
            ],
          },
          {
            kind: "screens",
            items: [
              {
                src: "/projects/cpgrams/text-01.webp",
                step: "Text 01",
                title: "An empty field and a prompt",
                body: "Input focused, nothing else required. The first thing asked has to be something the citizen can actually answer.",
                alt: "The CPGRAMS text flow opening screen with the message input ready.",
              },
              {
                src: "/projects/cpgrams/text-02.webp",
                step: "Text 02",
                title: "The complaint in their own words",
                body: "Plain language, no required structure. Everything the portal demanded up front is extracted from this one sentence.",
                alt: "A typed grievance in the CPGRAMS chat written in plain conversational language.",
              },
              {
                src: "/projects/cpgrams/text-03.webp",
                step: "Text 03",
                title: "Understood and acknowledged",
                body: "The reply restates the problem first. Earliest and cheapest error recovery, and it signals comprehension rather than keyword matching.",
                alt: "The CPGRAMS chatbot restating the citizen's grievance back to them.",
              },
              {
                src: "/projects/cpgrams/text-04.webp",
                step: "Text 04",
                title: "One question at a time",
                body: "Sequential questions, not a block of fields. The form still gets filled, it just never appears as a form.",
                alt: "The CPGRAMS chatbot asking a single follow-up question in the typed flow.",
              },
              {
                src: "/projects/cpgrams/text-05.webp",
                step: "Text 05",
                title: "Answering with structure when structure helps",
                body: "Closed sets get options, not an open field. Free text is the right default until it forces recall of an exact scheme name.",
                alt: "The CPGRAMS chatbot offering selectable options for a question with a closed set of answers.",
              },
              {
                src: "/projects/cpgrams/text-06.webp",
                step: "Text 06",
                title: "Documents, when they are needed",
                body: "Attachments requested at the point of relevance. On the portal an unmet document requirement at step two ends the session.",
                alt: "The CPGRAMS chatbot requesting a supporting document within the conversation.",
              },
              {
                src: "/projects/cpgrams/text-07.webp",
                step: "Text 07",
                title: "History that survives the session",
                body: "Conversations persist. The portal loses everything to a session timeout, which on a 2G connection is routine rather than rare.",
                alt: "The CPGRAMS chat with recent conversations listed in the left sidebar.",
              },
              {
                src: "/projects/cpgrams/text-08.webp",
                step: "Text 08",
                title: "Classification, done quietly",
                body: "Classification resolved from the conversation. The highest-friction field on the portal, moved off the citizen and onto the system that owns the taxonomy.",
                alt: "The CPGRAMS chatbot resolving the ministry and category for a typed grievance.",
              },
              {
                src: "/projects/cpgrams/text-09.webp",
                step: "Text 09",
                title: "Location and jurisdiction",
                body: "Jurisdiction inferred, then shown. Wrong-state routing is the failure most likely to burn the statutory clock unnoticed.",
                alt: "The CPGRAMS chatbot showing the detected state and jurisdiction for a grievance.",
              },
              {
                src: "/projects/cpgrams/text-10.webp",
                step: "Text 10",
                title: "The complete picture, assembled",
                body: "Everything gathered is assembled into one object: complaint, classification, jurisdiction, attachments. Seen whole for the first time.",
                alt: "The CPGRAMS chatbot presenting the assembled grievance with all collected details.",
              },
              {
                src: "/projects/cpgrams/text-11.webp",
                step: "Text 11",
                title: "Read it back",
                body: "Same review gate as the voice flow. Nothing becomes a legal submission unseen.",
                alt: "The CPGRAMS review card in the typed flow showing the interpreted grievance before submission.",
              },
              {
                src: "/projects/cpgrams/text-12.webp",
                step: "Text 12",
                title: "Submit, or escalate",
                body: "Primary, secondary and escalation, ranked by weight. Three outcomes, all reversible except the one explicitly chosen.",
                alt: "The CPGRAMS review card with submit grievance, new chat and a central authority escalation link.",
              },
              {
                src: "/projects/cpgrams/text-13.webp",
                step: "Text 13",
                title: "Filed, with a number",
                body: "Filed. From here it sits in the same machinery, with the same clock, as one filed by a lawyer on a desktop.",
                alt: "The CPGRAMS confirmation screen with a grievance registration identifier.",
              },
            ],
          },
          {
            kind: "gallery",
            items: [
              { src: "/projects/cpgrams/m-text-1.webp", label: "Open", alt: "CPGRAMS typed flow opening on a phone." },
              { src: "/projects/cpgrams/m-text-3.webp", label: "Describe", alt: "A typed grievance on a phone screen." },
              { src: "/projects/cpgrams/m-text-5.webp", label: "Follow up", alt: "The CPGRAMS chatbot asking a follow-up question on a phone." },
              { src: "/projects/cpgrams/m-text-6.webp", label: "Assemble", alt: "The assembled grievance on a phone screen." },
              { src: "/projects/cpgrams/m-text-7.webp", label: "Review", alt: "The CPGRAMS review card on a phone." },
              { src: "/projects/cpgrams/m-text-8.webp", label: "Filed", alt: "The CPGRAMS confirmation screen on a phone." },
            ],
            caption:
              "On a phone the review card becomes a full screen. It is the one moment in the product where something below the fold would be a genuine failure rather than an inconvenience.",
          },
        ],
      },
      {
        name: "decisions",
        heading: "The decisions",
        blocks: [
          {
            kind: "numbered",
            items: [
              {
                label: "Never ask for the ministry",
                body: "The highest-friction field on the original portal and the one a citizen is least equipped to answer. Inferred from what they said, confirmed at review, never asked.",
              },
              {
                label: "Detect the language, do not offer a list",
                body: "A language picker is a reading test given to people who may not read. Detection removes the test and the interface adapts to what it heard.",
              },
              {
                label: "Speak every answer, not just accept speech",
                body: "Voice in with text out solves half the literacy problem and then abandons the user at the half containing the answer.",
              },
              {
                label: "Press, do not press and hold",
                body: "Hold-to-record fails for tremor and arthritis, and the 60-plus group files more grievances than anyone else on the platform.",
              },
              {
                label: "Show the interpretation before submitting",
                body: "Auto-filing a legal document for somebody requires their consent to what it says. The review screen is where the system admits what it assumed.",
              },
              {
                label: "Give a wrong answer somewhere to go",
                body: "When state-level routing is wrong, escalation to the Central Authority is one tap rather than starting again.",
              },
              {
                label: "Keep the state's own visual authority",
                body: "The saffron, the emblem, the departmental masthead, the ministers. A grievance tool that looks unofficial does not get trusted with a grievance.",
              },
            ],
          },
        ],
      },
      {
        name: "system",
        heading: "The system underneath",
        blocks: [
          {
            kind: "prose",
            body: [
              "A component set built for a conversation rather than a page: message bubbles by speaker, audio players with waveforms, state and language tags, the review card, tutorial spotlights, and the mascot in each of her states.",
            ],
          },
          {
            kind: "specs",
            items: [
              { name: "Saffron", value: "#FE6700", swatch: "#FE6700", note: "Primary action, government identity" },
              { name: "Deep", value: "#9F2D00", swatch: "#9F2D00", note: "Pressed and emphasis" },
              { name: "Warm", value: "#FFC196", swatch: "#FFC196", note: "Surfaces and user bubbles" },
              { name: "Cream", value: "#FFFBEF", swatch: "#FFFBEF", note: "Chat canvas" },
              { name: "Ink", value: "#333333", swatch: "#333333", note: "Body copy" },
              { name: "Slate", value: "#4A505B", swatch: "#4A505B", note: "Secondary text and labels" },
              { name: "Interface", value: "Inter", note: "Chat, controls, labels" },
              { name: "Supporting", value: "General Sans", note: "Headings" },
              { name: "Script", value: "Roboto", note: "Devanagari and regional coverage" },
            ],
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/cpgrams/components-1.webp",
                label: "Message and input components",
                alt: "A Figma component set for the CPGRAMS chatbot showing message bubble and input variants.",
              },
              {
                src: "/projects/cpgrams/components-2.webp",
                label: "State variants",
                alt: "A Figma component set showing state variants for the CPGRAMS chatbot controls.",
              },
            ],
            caption:
              "Roboto is in the stack for one specific reason: it carries Devanagari and most regional scripts. A product claiming 22 languages cannot ship a typeface that renders two of them.",
          },
        ],
      },
      {
        name: "outcome",
        heading: "What changed",
        blocks: [
          {
            kind: "prose",
            body: [
              "It is live at cpgramsaichatbot.com, running against the real grievance system rather than standing as a concept.",
              "For a citizen, the qualification required to complain to their own government dropped from reading English or Hindi and knowing how ninety ministries are organised, to being able to speak. For DARPG, grievances now arrive pre-categorised and correctly routed, which is work that previously landed on an officer before the statutory clock had even started.",
              "The work was scoped against projections of 3x more grievances filed, a 40% reduction in incomplete submissions and 85% satisfaction. Those are targets rather than results, and post-launch numbers sit with the department.",
            ],
          },
        ],
      },
      {
        name: "reflection",
        heading: "What I learned",
        blocks: [
          {
            kind: "prose",
            body: [
              "Designing for government taught me that accessibility is not a layer applied to a finished product. Here it was the product. Remove voice and you have not built a slightly less inclusive chatbot, you have rebuilt the thing that was already failing.",
              "It also changed how I think about automation. The instinct with a form this painful is to remove it completely and let the system handle everything silently. But the moment software files a legal document on somebody's behalf, hiding its reasoning stops being convenience and becomes exposure. The review screen is the least clever thing in this project and almost certainly the most important.",
              "And working at national scale reframed what a design decision costs. A dropdown that confuses 5% of users is a usability issue in most products. On a system serving 1.4 billion people it is tens of millions of citizens who never get heard, which is a different kind of number to be responsible for.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "layover",
    /* a shipped product and a full deep dive, so it belongs in both lists */
    alsoCaseStudy: true,
    title: "Layover",
    logoText: "layover*",
    logoUrl: "/projects/layover-logo.webp",
    category: "Brand & Product Design",
    year: "2025",
    cover: "/projects/layover-cover.webp",
    preview: { kind: "website", href: "https://mylayover.in/", image: "/projects/layover-cover.webp" },
    cta: "Visit Website",
    role: "Lead Product Designer",
    tools: ["Figma", "Prototyping"],
    description:
      "A layover is dead time you’ve already paid for. Layover turns it into something usable: enter your airport or PNR and it shows what’s actually open in your terminal right now, so you can order a meal to your gate or book into a lounge. Built around Indian airports (Delhi, Mumbai, Bengaluru, Hyderabad) and the details that matter there: terminal-aware delivery, veg and non-veg filters as a first-class control, and a live prep timer so you know whether you have time before boarding.",
    extraFacts: [
      ["Timeline", "2024 to 2026"],
      ["Scope", "Research, IA, user flows, UX, UI, brand, design system"],
      ["Surfaces", "Marketing site, web app, mobile app, vendor portal, admin portal"],
      ["Airports", "Delhi IGI, Mumbai CSIA, Bengaluru KIA, Hyderabad RGIA"],
      ["Outcome", "Funded; pilot talks underway with Indian airports"],
    ],
    highlights: [
      "Terminal-aware delivery, so every restaurant card carries its pier",
      "Veg and non-veg filters promoted to a first-class control",
      "Live prep timer, so you know whether you have time before boarding",
    ],
    /* two years of work, so this one runs long-form rather than as a gallery.
       The five frames below are the ones that exist as exports today; the
       sections are written so more can slot in beside them without the
       argument changing shape. */
    sections: [
      {
        name: "problem",
        heading: "The problem",
        blocks: [
          {
            kind: "prose",
            body: [
              "The hero of this story is not me. It is two people who never meet.",
              "The first is the traveller with a layover: two hours to burn, a bag they cannot leave, and no idea whether the lounge their credit card supposedly unlocks will actually let them in. The second is the outlet manager on the other side of the terminal, whose kitchen goes from dead to slammed with no warning.",
              "They want the same thing from opposite directions. The traveller wants to know how long. The operator wants to know how many. Nobody had built the layer between them.",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "Lounge access was a guess, not a service",
                body: "Long queues, membership rules nobody could parse, and no way to see whether a seat was free. You found out at the counter, in front of everyone.",
              },
              {
                label: "Terminal food was invisible",
                body: "Outlets existed but had no digital presence. No listing, no live menu, no way to compare, no way to order ahead.",
              },
              {
                label: "Nothing connected",
                body: "Travellers walked the terminal to gather information a screen should have handed them in three seconds.",
              },
              {
                label: "High demand, low efficiency",
                body: "The willingness to pay for comfort was already there. Manual, counter-and-paper systems on both sides were the only thing standing between it and the money.",
              },
            ],
          },
        ],
      },
      {
        name: "stakes",
        heading: "Why it mattered",
        blocks: [
          {
            kind: "stats",
            items: [
              { value: "$5.71B", label: "global airport lounge market, growing 15% a year" },
              { value: "10,000+", label: "airports worldwide, almost none digitally connected end to end" },
              { value: "2 stars", label: "the app rating of the incumbent that already owned the partnerships" },
            ],
          },
          {
            kind: "prose",
            body: [
              "That last number is the one that mattered. The category was not short on supply. The dominant player already had the bank deals, the airline deals and the lounge network. What it did not have was a product anyone wanted to open twice: no real-time seat booking, no automated entry, and an app its own users rated two stars.",
              "So the gap was never access. The gap was the interface to access. That is a design problem, and a defensible one, because partnerships take years to copy and taste takes longer.",
            ],
          },
        ],
      },
      {
        name: "research",
        heading: "What I found",
        blocks: [
          {
            kind: "prose",
            body: [
              "I ran user research with travellers on what actually goes wrong when they try to eat or find a lounge inside an airport, then mapped the entire journey as a flow before drawing a single screen: location access, login, terminal selection, filters, menu, cart, checkout, tracking, support. Every branch, every overlay, every “what if they have not signed in yet”.",
            ],
          },
          {
            kind: "flow",
            steps: [
              { label: "Land", sub: ["Airport or PNR", "No account asked for"] },
              { label: "Terminal", sub: ["Detected or picked", "Sets everything after it"] },
              { label: "Outlets", sub: ["Veg or non-veg", "Pier and walk time", "Prep time"] },
              { label: "Menu", sub: ["Live availability", "Item options"] },
              { label: "Cart", sub: ["Edit before committing"] },
              { label: "Account", decision: true, sub: ["Requested here, not earlier", "The only hard gate"] },
              { label: "Pay", sub: ["Saved methods", "Single confirm"] },
              { label: "Track", sub: ["Ready in 20 minutes", "Directions to the pier"] },
            ],
            caption:
              "The flow that survived. The original had the account request at step two, which is where most of the eleven clicks were hiding: everything before Cart is now browsable by a stranger, and the one hard gate sits at the moment money is involved.",
          },
          {
            kind: "numbered",
            items: [
              {
                label: "The first flow was eleven clicks deep",
                body: "Counting from landing to placed order, the structure I had mapped took eleven clicks. In a terminal, holding a bag, watching a departure board. Eleven.",
              },
              {
                label: "Login was blocking the wrong thing",
                body: "The first structure gated browsing behind an account. But nobody in an airport wants an account, they want a sandwich. The account request had to move from the front door to the checkout.",
              },
              {
                label: "Location is not a preference, it is the product",
                body: "Nothing else on screen means anything until the app knows which terminal you are standing in. “Departures, Terminal 3” is not metadata, it is the primary key for every listing, price and walk time on the page.",
              },
            ],
          },
        ],
      },
      {
        name: "insight",
        blocks: [
          {
            kind: "statement",
            text: "Travellers were not struggling because ordering was hard. They were struggling because they could not predict time.",
          },
          {
            kind: "prose",
            body: [
              "The moment I stopped designing a food-ordering app and started designing a time-certainty app, every screen resolved itself.",
              "A prep-time badge stopped being a nice detail and became the most important element on the card. Get Directions earned equal weight with Order Now, because in an airport food you cannot find in time is worth nothing. The QR code stopped being a payment feature and became a queue-removal feature. The tracker stopped saying “preparing” and started saying “ready in 20 minutes”.",
              "Same components. Completely different product.",
            ],
          },
        ],
      },
      {
        name: "brand",
        heading: "The mark",
        blocks: [
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/brand.webp",
              wide: true,
              caption:
                "The wordmark, with the rotated “e”. A plane turning back on itself, which is the whole idea of a layover in one letter.",
              alt:
                "The LayOver wordmark in white on a black billboard on a tree-lined street, the “e” rotated 180 degrees.",
            },
          },
          {
            kind: "prose",
            body: [
              "Airport terminals are grey, fluorescent and loud. The brand goes the exact opposite way: warm bronze and gold on near-black, closer to a business-class cabin at night than to a food court. The promise is not speed, it is comfort you did not expect to get.",
            ],
          },
        ],
      },
      {
        name: "surfaces",
        heading: "Four surfaces, one system",
        blocks: [
          {
            kind: "prose",
            body: [
              "An airport transaction touches four people, so it needed four products. Not one app with four modes. Four surfaces, each designed for a different body position: a traveller walking, a cook standing at a pass, a manager at a desk, an operator at a console.",
              "The two a traveller sees are dark and photographic. The two an operator lives in are light, dense and flat. That split is the single biggest design decision in the project, and everything below follows from it.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/system.webp",
              wide: true,
              caption: "Site and app as one system. The dark front door, the warm room behind it.",
              alt:
                "Layover’s marketing site and mobile app shown together, the dark landing page beside the two cream ordering screens.",
            },
          },
        ],
      },
      {
        name: "website",
        heading: "The website",
        blocks: [
          {
            kind: "prose",
            body: [
              "Six passes to get here. The final direction stops explaining Layover and starts being it: the airport selector lives inside the hero, so the first thing the site does is the first thing the product does.",
              "It is not a brochure with an app store button. The full ordering journey runs on the web, because nobody installs an app for a two-hour layover.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/web-landing.webp",
              wide: true,
              caption:
                "The landing page, full scroll. One question at the top, the three-step explainer as a carousel because the process genuinely is sequential, and lounges presented as Coming Soon rather than hidden.",
              alt: "The full Layover landing page: a dark hero over an airport atrium with an airport and PNR entry field, a three-step carousel, a VIP lounge Coming Soon card, an app download band and the footer.",
            },
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/web-terminal.webp",
              wide: true,
              caption:
                "The terminal entry page. Everything past this point is filtered by where you are standing, so this screen is the hinge the whole product turns on.",
              alt: "Layover's terminal selection page on desktop, dark with bronze accents, listing Indian airports and their terminals.",
            },
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/web-eateries.webp",
                label: "Outlet directory",
                alt: "Layover's web outlet directory showing Tim Hortons, Starbucks, Theobroma, McDonald's, Berco's, Idli.com, KFC and Subway as cards, each labelled T3 domestic departure piers with Order now and Get Directions actions.",
              },
              {
                src: "/projects/layover/web-menu.webp",
                label: "Outlet menu",
                alt: "A restaurant menu page on Layover's website with dish cards, prices and add to cart controls.",
              },
            ],
            caption:
              "Every card carries its pier rather than a street address, and Get Directions sits level with Order Now. In a terminal, food you cannot find in time is worth nothing.",
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/web-about.webp",
                label: "About",
                alt: "Layover's About section on the website, describing the product over a dark background.",
              },
              {
                src: "/projects/layover/web-contact.webp",
                label: "Get in touch",
                alt: "Layover's contact and footer section with a message form and business enquiry links.",
              },
            ],
            caption: "The supporting pages, built on the same dark and bronze system so nothing reads as bolted on.",
          },
          {
            kind: "gallery",
            items: [
              {
                src: "/projects/layover/web-mobile-home.webp",
                label: "Responsive home",
                alt: "Layover's website on a phone, showing the dark home layout with outlet cards.",
              },
              {
                src: "/projects/layover/web-mobile-order.webp",
                label: "Responsive order",
                alt: "Layover's website order flow on a phone, showing the itemised order and prep timer.",
              },
              {
                src: "/projects/layover/order.webp",
                label: "Order tracking",
                alt: "Layover's order-confirmed screen with a twenty-minute prep timer, itemised order and a map.",
              },
            ],
            caption:
              "The web product on a phone, which is how most of it actually gets used. Status language is replaced by a countdown and the outlet's location stays on screen the whole time.",
          },
        ],
      },
      {
        name: "app",
        heading: "The traveller's app",
        blocks: [
          {
            kind: "prose",
            body: [
              "The app opens on the only question that matters: which airport, which terminal. Until it knows that, no listing on the screen means anything, so location is not a setting buried in a profile, it is the first thing after sign-up.",
              "From there the whole flow is built to be finishable in one hand while walking. Onboarding is three screens, ordering is four taps, and every outlet card answers who, how far, how good and how long before you commit to opening it.",
            ],
          },
          {
            kind: "gallery",
            items: [
              {
                src: "/projects/layover/app-signup.webp",
                label: "Sign up",
                alt: "The Layover app sign-up screen with phone number entry.",
              },
              {
                src: "/projects/layover/app-onboarding.webp",
                label: "Onboarding, three screens",
                alt: "Layover app onboarding screen on a dark background with an illustration of a globe, a burger and a drink, and the line All your airport needs, in one app.",
              },
              {
                src: "/projects/layover/app-location.webp",
                label: "Pick your airport",
                alt: "The Layover app's airport selection screen, listing Indian airports and terminals with a search field.",
              },
              {
                src: "/projects/layover/app-location-type.webp",
                label: "Then your terminal",
                alt: "The Layover app's terminal and travel type selection screen.",
              },
            ],
            caption:
              "Sign-up took thirteen versions to get to this. Everything after it is a consequence of one decision: ask where you are before you ask anything else.",
          },
          {
            kind: "gallery",
            items: [
              {
                src: "/projects/layover/app-home.webp",
                label: "Outlets in your terminal",
                alt: "The Layover app home screen showing Departures Terminal 3, a veg toggle, Food and Cafe tabs, and outlet cards with ratings and ten to fifteen minute prep times.",
              },
              {
                src: "/projects/layover/app-menu.webp",
                label: "Menu",
                alt: "A restaurant menu screen in the Layover app with dish images, prices in rupees and add buttons.",
              },
              {
                src: "/projects/layover/app-menu-option.webp",
                label: "Item options",
                alt: "The Layover app's item customisation screen with size and add-on options.",
              },
              {
                src: "/projects/layover/app-added.webp",
                label: "Added to cart",
                alt: "The Layover app menu screen with an item added and the cart count updated.",
              },
            ],
            caption:
              "The veg and non-veg toggle sits in the header rather than inside a filter drawer. For a large share of Indian travellers this is not a refinement, it is the first decision they make.",
          },
          {
            kind: "gallery",
            items: [
              {
                src: "/projects/layover/app-cart.webp",
                label: "Cart",
                alt: "The Layover app cart screen listing ordered items with quantities and totals.",
              },
              {
                src: "/projects/layover/app-cart-pay.webp",
                label: "Payment breakdown",
                alt: "The Layover app cart with the to-pay dropdown expanded, showing item totals, taxes and fees.",
              },
            ],
            caption: "Checkout is where the account is finally requested, not before. Browsing stays free.",
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/app.webp",
              caption:
                "The same flow in the launch presentation. Every card answers four questions before you tap it: who, how far, how good, how long.",
              alt: "Two phone screens showing Layover's food ordering interface in cream and gold: a delivery destination of Layover office, a greeting, a dish search field, category chips for fries and burgers, and an Open Stalls section.",
            },
          },
        ],
      },
      {
        name: "vendor portal",
        heading: "The vendor portal",
        blocks: [
          {
            kind: "prose",
            body: [
              "The outlet side is where the visual system flips. An order queue gets read standing up, under fluorescent light, at arm's length, by someone whose hands are full. So it is light, flat and high contrast, with no gradient, no photography and nothing decorative competing with a number.",
              "It is also the largest surface in the project. An outlet's entire working life runs through it: signing up, getting approved, taking orders, editing a menu at 6am, running a coupon, reading a review, changing bank details.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/flow-vendor.webp",
              wide: true,
              caption:
                "The whole vendor surface as it sits on the canvas: login, six-step onboarding, dashboard, orders, menu and its edit states, coupons, revenue, reviews, and the profile and settings flow including bank verification.",
              alt: "A Figma board showing every screen of the Layover vendor portal arranged in rows, from login and onboarding through dashboard, orders, menu, coupons, revenue, reviews and profile settings.",
            },
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/vendor-dashboard.webp",
              wide: true,
              caption:
                "The order wall. Incoming order at the top with Accept and Reject as the two largest targets on the screen, everything else below in state order: preparing, ready, delivered. No navigation to learn, the whole job lives here.",
              alt: "Layover's vendor dashboard, light interface with a sidebar of Dashboard, Orders, Menu, Coupons, Revenue and Reviews, an incoming order card with Accept and Reject buttons, and a grid of order cards marked Ready or Delivered.",
            },
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/vendor-onboarding.webp",
              wide: true,
              caption:
                "Onboarding as one continuous path with a visible step counter. An outlet manager signing up is not a designer's user, so there is no branching and no way to get lost.",
              alt: "The six-step Layover vendor onboarding flow laid out left to right, from business details through document upload to an application-submitted confirmation.",
            },
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/vendor-menu.webp",
                label: "Menu",
                alt: "Layover's vendor menu management screen showing menu sections with food item cards, prices and edit controls.",
              },
              {
                src: "/projects/layover/vendor-addedit-section.webp",
                label: "Add / edit section",
                alt: "The add or edit section dialog in Layover's vendor menu manager, with a name field and availability controls.",
              },
            ],
            caption:
              "Menus change daily and a stale menu in an airport means a refunded order, so sections and items are edited in place rather than through a separate builder.",
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/vendor-addedit-item.webp",
                label: "Add / edit item",
                alt: "The add or edit item screen in Layover's vendor portal, with a dish photo, name, price, description and option groups.",
              },
              {
                src: "/projects/layover/vendor-empty.webp",
                label: "Empty state",
                alt: "The empty menu state in Layover's vendor portal, with an illustration and an Add Your First Section button.",
              },
            ],
            caption:
              "The empty state got the same attention as the dashboard. A new outlet's first login is their first impression of the entire platform, and it is a screen with nothing in it.",
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/vendor-orders.webp",
                label: "Orders",
                alt: "Layover's vendor orders screen listing past and current orders with statuses and totals.",
              },
              {
                src: "/projects/layover/vendor-coupons.webp",
                label: "Coupons",
                alt: "Layover's vendor coupons screen showing discount codes with percentages, QR codes and expiry details.",
              },
            ],
            caption: "Order history and promotions, both reusing the same card language as the live wall so nothing has to be relearned.",
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/vendor-analytics.webp",
                label: "Revenue and analytics",
                alt: "Layover's vendor analytics screen with revenue charts, top selling items and average order value.",
              },
              {
                src: "/projects/layover/vendor-reviews.webp",
                label: "Reviews",
                alt: "Layover's vendor reviews screen with a list of customer reviews, star ratings and reply controls.",
              },
            ],
            caption:
              "Analytics answers the operator's version of the traveller's question. The traveller asks how long. The operator asks how many, and when.",
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/vendor-settings.webp",
              wide: true,
              caption:
                "Profile and settings, including the bank detail and OTP verification flow. Unglamorous, and the screen an outlet touches on the day the money is supposed to arrive.",
              alt: "The Layover vendor profile and settings flow: business details, bank details, OTP verification and a verified confirmation state.",
            },
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/vendor-login.webp",
              wide: true,
              caption: "Login and password reset, the two screens an outlet sees before anything else works.",
              alt: "Layover's vendor login screen with email and password fields beside a reset password screen.",
            },
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/vendor-mobile.webp",
              narrow: true,
              caption: "On a busy day nobody is sitting at the desk, so the order wall had to survive in a pocket.",
              alt: "The Layover vendor dashboard on a phone, showing a compact order list with status controls.",
            },
          },
        ],
      },
      {
        name: "admin portal",
        heading: "The admin portal",
        blocks: [
          {
            kind: "prose",
            body: [
              "The layer nobody sees and everything depends on: approving outlets, watching how each one performs, managing users, and keeping an eye on every order moving through the platform.",
              "Designed for scanning rather than exploring. Every vendor row surfaces the same four metrics in the same four positions, so a hundred outlets can be read at the speed of one.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/admin-vendors.webp",
              wide: true,
              caption:
                "Vendor management. Orders, revenue, rating and prep time in fixed positions on every row, with a single toggle to take an outlet offline the moment something goes wrong in a terminal.",
              alt: "Layover's admin vendor management screen listing outlets with orders, revenue, rating and prep time metrics and an active toggle on each row.",
            },
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/admin-onboarding.webp",
                label: "Vendor onboarding",
                alt: "Layover's admin vendor onboarding screen with outlet application details and approval controls.",
              },
              {
                src: "/projects/layover/admin-vendor-menu.webp",
                label: "Vendor menu oversight",
                alt: "Layover's admin view of a vendor's menu, showing item cards with prices and availability.",
              },
            ],
            caption:
              "Approval and oversight. Admin can see and correct a vendor's menu directly, because at launch an outlet's first menu upload is rarely right.",
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/admin-menu.webp",
                label: "Menu management",
                alt: "Layover's admin menu management screen with sections and food item cards.",
              },
              {
                src: "/projects/layover/admin-orders.webp",
                label: "Platform orders",
                alt: "Layover's admin orders screen listing orders across all vendors with statuses.",
              },
            ],
            caption: "The same menu and order tools as the vendor portal, one level up, so support can act without asking an outlet to do it.",
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/layover/admin-addedit-section.webp",
                label: "Add / edit section",
                alt: "The admin add or edit menu section screen in Layover's admin portal.",
              },
              {
                src: "/projects/layover/admin-addedit-item.webp",
                label: "Add / edit item",
                alt: "The admin add or edit item screen in Layover's admin portal, with a dish image, price and option controls.",
              },
            ],
            caption: "Deliberately identical to the vendor equivalents. Two codebases for the same job is how the two drift apart.",
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/admin-users.webp",
              wide: true,
              caption: "User management, kept plain. This screen exists to answer a support ticket, not to be browsed.",
              alt: "Layover's admin user management screen with a table of users and their order history.",
            },
          },
        ],
      },
      {
        name: "decisions",
        heading: "The decisions",
        blocks: [
          {
            kind: "numbered",
            items: [
              {
                label: "Prep time gets equal billing with price",
                body: "On a restaurant app, price decides. In a terminal, time decides. Every card leads with minutes.",
              },
              {
                label: "Get Directions sits next to Order Now",
                body: "Ordering food you cannot find is worse than not ordering. Two actions, equal weight, always paired.",
              },
              {
                label: "Login moved from the front door to the checkout",
                body: "Browsing is free. The account is only requested at the moment it becomes necessary, which cut the path to a first order sharply.",
              },
              {
                label: "Veg and non-veg is a header control, not a filter",
                body: "Filters are for refining. For a large share of Indian travellers this is a first-class identity decision, so it lives where they see it first.",
              },
              {
                label: "Two visual systems, one brand",
                body: "Dark and warm for travellers, light and dense for operators. Same wordmark, same geometry, opposite temperature, because the two are used in opposite lighting for opposite reasons.",
              },
              {
                label: "Empty states were designed, not deferred",
                body: "A new outlet’s first login shows an empty menu. That screen is their first impression of the entire platform, so it got the same attention as the dashboard.",
              },
            ],
          },
        ],
      },
      {
        name: "iteration",
        heading: "Getting it wrong first",
        blocks: [
          {
            kind: "prose",
            body: [
              "Nothing here arrived fully formed. The marketing site went through six full passes, each one a separate labelled canvas: first structure, restructure, a wide exploration board, a near-final, a final, and the final that actually shipped.",
              "Between the first and the last, the hero went from an empty carousel shell to an airport selector, and the listing went from four unlabelled tiles to cards carrying four data points each. The sign-up screen alone reached version thirteen.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/iterations.webp",
              wide: true,
              caption:
                "One pass, as it sits on the canvas. Ten full page layouts explored in parallel before anything was chosen, and this is the first of six such boards.",
              alt: "A Figma canvas board holding ten full-page dark website layouts for Layover, arranged in a grid as parallel explorations.",
            },
          },
          {
            kind: "stats",
            items: [
              { value: "4", label: "product surfaces designed" },
              { value: "6", label: "full iteration passes on the marketing site" },
              { value: "13", label: "versions of the sign-up screen alone" },
            ],
          },
        ],
      },
      {
        name: "tokens",
        heading: "The system underneath",
        blocks: [
          {
            kind: "prose",
            body: [
              "Built to survive four surfaces and two lighting conditions without either half looking borrowed from the other.",
            ],
          },
          {
            kind: "specs",
            items: [
              { name: "Bronze", value: "#7C6A46", swatch: "#7C6A46", note: "Primary brand, borders, fills" },
              { name: "Gold", value: "#C9A769", swatch: "#C9A769", note: "Accents, active states" },
              { name: "Gold Light", value: "#FDCE77", swatch: "#FDCE77", note: "Emphasis on dark, badges" },
              { name: "Ink", value: "#0D0D0D", swatch: "#0D0D0D", note: "Consumer surface base" },
              { name: "Surface", value: "#1E1E1E", swatch: "#1E1E1E", note: "Elevated cards on dark" },
              { name: "Paper", value: "#FFFFFF", swatch: "#FFFFFF", note: "Operator surface base" },
              { name: "Alert", value: "#F65F5F", swatch: "#F65F5F", note: "Reject, non-veg, destructive" },
              { name: "Display", value: "Montserrat", note: "Marketing and consumer product" },
              { name: "Secondary", value: "Sofia Pro", note: "Supporting voice" },
              { name: "Interface", value: "Inter", note: "Vendor and admin portals, where density beats personality" },
            ],
          },
        ],
      },
      {
        name: "outcome",
        heading: "What changed",
        blocks: [
          {
            kind: "prose",
            body: [
              "For travellers, the path from opening the site to a placed order went from an eleven-click structure to a flow where location, terminal and wait time are answered before they are asked.",
              "For outlets, demand became visible before it arrived, and the order queue became a single glanceable wall instead of a counter and a shout.",
              "For Layover, an idea became a system concrete enough to build and to sell. The work did double duty as the product spec and the fundraising material: the company raised on it, and pilot conversations with Indian airports are underway.",
            ],
          },
        ],
      },
      {
        name: "reflection",
        heading: "What I learned",
        blocks: [
          {
            kind: "prose",
            body: [
              "The hardest part of a project like this is resisting the urge to design the thing you were asked for.",
              "I was asked for a food-ordering app. What the traveller actually needed was an answer to “will I make my flight”. Those two look identical on a wireframe and behave nothing alike in a terminal.",
              "I also learned that designing for four users at once is not four times the work, it is a different kind of work. The value was never in the individual screens. It was in making sure a decision made on the traveller’s screen still made sense to the person in the kitchen twenty metres away.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "yantra",
    title: "Yantra",
    logoText: "Yantra",
    category: "3d interactive website",
    year: "2026",
    cover: "/projects/yantra-cover.webp",
    preview: {
      kind: "website",
      href: "https://yantra-xi.vercel.app/",
      image: "/projects/yantra-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["3D", "Web Design"],
    description:
      "Yantra is a week-long technical fest exclusive to VIT students, focused on enriching student life and elevating event experiences. It brings together technical events, workshops, and hackathons, while fostering a secure, inclusive, and welcoming environment that promotes holistic student growth.",
    highlights: [
      "3D interactive environment built for high engagement",
      "Unified portal for technical events and hackathons",
      "Elevated event experience focused on holistic student growth",
    ],
  },
  {
    id: "dropby",
    title: "DropBy",
    logoText: "dropby.",
    logoUrl: "/projects/dropby-logo.webp",
    category: "Product Design",
    year: "2024",
    cover: "/projects/dropby-cover.webp",
    preview: {
      kind: "website",
      image: "/projects/dropby-cover.webp",
      href: "https://www.behance.net/gallery/230479963",
    },
    cta: "View Full Project on Behance",
    role: "Product Design",
    tools: ["Figma", "Prototyping"],
    description:
      "Product design and visual identity for DropBy, a location-first social app, from flows to a cohesive interface system.",
    highlights: [
      "Location-first interaction model designed from first principles",
      "Full visual identity built alongside the product from day one",
      "Prototype-tested flows refined through multiple usability passes",
    ],
  },
  {
    id: "futurepreneurs",
    title: "Futurepreneurs",
    logoText: "FUTUREPRENEURS",
    logoUrl: "/projects/futurepreneurs-logo.webp",
    category: "Event Website",
    year: "2024",
    cover: "/projects/futurepreneurs-cover.webp",
    preview: {
      kind: "website",
      href: "https://riviera.vit.ac.in/",
      image: "/projects/futurepreneurs-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["Framer", "Figma"],
    description:
      "An event website for Futurepreneurs, a founders' initiative, presented with a confident, startup-grade identity.",
    highlights: [
      "Founder-first narrative translated into a confident startup-grade site",
      "Built for fast content updates across a multi-week event",
      "Responsive system tuned for heavy mobile traffic on event day",
    ],
  },
  {
    id: "gravitas",
    title: "Gravitas",
    logoText: "GRAVITAS·25",
    logoUrl: "/projects/gravitas-logo.webp",
    category: "Website + Branding",
    year: "2025",
    cover: "/projects/gravitas-cover.webp",
    preview: {
      kind: "website",
      image: "/projects/gravitas-cover.webp",
      href: "https://www.behance.net/gallery/239867397",
    },
    cta: "View Full Project on Behance",
    role: "Brand + Web Design",
    tools: ["Figma", "Illustrator", "Framer"],
    description:
      "An end-to-end brand system and website for Gravitas, a flagship techno-management fest, scaled across every touchpoint.",
    highlights: [
      "Unified identity system scaled across print, stage and digital",
      "Signature visual language built around a bold techno-management theme",
      "Website structured to carry the fest's scale without losing clarity",
    ],
  },
  {
    id: "meal-maestro",
    kind: "case-study",
    title: "Meal Maestro",
    logoText: "Meal Maestro",
    category: "UI Design",
    year: "2025",
    cover: "/projects/meal-maestro/cover.webp",
    preview: {
      kind: "website",
      href: "https://www.behance.net/AAYUSHVISUALS",
      image: "/projects/meal-maestro/cover.webp",
    },
    cta: "View on Behance",
    role: "UI design",
    tools: ["Figma"],
    description:
      "A meal-planning app built around one idea: the hard part isn’t cooking, it’s deciding. Meal Maestro takes what you like, what you avoid and what’s already in the kitchen, and turns it into a week of recipes and the one grocery list that covers them. Placed third at the GDG Design-a-thon.",
    extraFacts: [
      ["Recognition", "3rd — GDG Design-a-thon"],
      ["Research", "12 interviews · 140 survey responses · 5 weeks"],
    ],
    highlights: [
      "Grounded in primary research — 12 discovery interviews, 140 survey responses and 4 comparison teardowns",
      "Built on why people abandon meal planning, not on what an app could do",
      "Full design system: Poppins for display and headings, Open Sans for body",
    ],
    shots: [
      {
        /* The complete case study, exported at 1400x22306 and sliced into 18
           pieces — see the note on the strip shot type above for why it
           cannot ship as a single file. */
        strip: Array.from(
          { length: 18 },
          (_, i) => `/projects/meal-maestro/s${String(i).padStart(2, "0")}.webp`
        ),
        sliceW: 1400,
        sliceH: 1240,
        lastSliceH: 1226,
        wide: true,
        caption:
          "The full case study — research with real users, the insights it earned, the design system, and the flows it produced.",
        alt:
          "The Meal Maestro case study: a smart meal-planning app for personalised recommendations and nutrition guidance. It runs from the goal of making healthy eating simpler, through branding and primary research grounded in real voices and real data (12 discovery interviews, 140 survey responses, 4 comparison teardowns, 5 weeks), into key insights about why people abandon meal planning, then a design system of colour and type — Poppins for display and headings, Open Sans for body — and finally the home, recipe detail, tracker and explore flows.",
      },
    ],
  },
];
