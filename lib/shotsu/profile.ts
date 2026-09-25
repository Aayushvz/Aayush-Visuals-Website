/*
  Everything Shotsu knows about Aayush, written from his three resumes
  (design, tech, product) and this site. It is the whole of Shotsu's
  knowledge: the system prompt tells it to answer from this and nothing
  else, so keep it accurate - if a fact changes, change it here.

  Deliberately left out: the phone number and the personal email. The
  public way to reach him is the site email and the contact page.

  Where the resumes disagree (years of experience; which years DevJams was
  won), this follows the design resume or says only what they all agree on.
*/

export const PROFILE = `
# Aayush Raj

Product Designer and Design Engineer based in India. Works across UI/UX design, design systems and product strategy, and builds what he designs (React, Next.js, Framer Motion, Three.js). Also works as a product manager and has shipped software engineering projects. 4+ years across UI/UX, branding and motion.

Contact: aayushvisuals@gmail.com, or the contact page on this site (/contact). LinkedIn: linkedin.com/in/aayushvz. GitHub: github.com/Aayushvz. Behance: behance.net/AAYUSHVISUALS. Portfolio: aayushvisuals.com.

Availability: open to full-time opportunities and product design / product management roles; available full time January to June 2027 for an internship, and open to relocating to Bengaluru.

## Education
B.Tech in Computer Science and Engineering (Core), Vellore Institute of Technology (VIT), Vellore, 2023 to 2027. CGPA 8.23/10. Class XII 85%, Class X 96%.

## Experience
- Product Design Intern / Product Intern, KPMG India (GovTech), June to July 2026. Owned the end-to-end conversational experience for CPGRAMS, the Government of India's national grievance-redressal chatbot: multi-persona journeys, speech-to-text intake, auto-filled grievance forms, a pre-submission review screen, and automated routing of cases to the right ministry. Built a 22+ language experience with real-time language detection and adaptive UI, and designed "Samadhan Didi", a lip-synced animated mascot that makes grievance reporting accessible to citizens with low digital or legal literacy. Case study: /work/cpgrams.
- Product Designer, LayOver (0-to-1 travel commerce app), 2025 to 2026. Took an airport lounge and food-ordering app from 0 to 1: user research, competitive analysis, information architecture and 20+ screens through to engineering handoff. Answered the core question "will my order arrive before boarding?" with PNR-based terminal detection, terminal-aware delivery, veg / non-veg filtering and a live prep timer. Case study: /work/layover.
- UI/UX Designer, Mike Tyson Invitational, December 2025 to February 2026. Led product design of the event's digital platform, turning the "Iron Forge" brand concept into an immersive UI across ticketing, live streaming and registration, working with engineering, marketing and brand to hit a fixed launch date. Case study: /work/mike-tyson-invitational.
- Design Manager, Riviera (VIT Vellore's festival), September 2025 to February 2026. Defined the full visual identity system (logo, design system, social, merchandise, environmental graphics, LED screen visuals), raising brand recall 35% year on year, and shipped the festival platform UI with zero critical UX failures across 500K+ visits. Led a 100+ person team across UI/UX, brand and web.

## Leadership
- Head of Design, Entrepreneurship Cell, VIT, May 2025 to April 2026. Led and mentored a 75+ member design team across concurrent product initiatives; grew registrations 22% and social reach 30%.
- Manager, Yantra, VIT Vellore, 2026. Led a 30+ member team to deliver a performance-optimised 3D web experience.
- Organiser, Makeathon, VIT Vellore, 2025 to 2026. Coordinated 70+ people across technical operations, registrations, websites and hackathon dashboards; delivered two editions in five months.

## Engineering and product projects
- Riviera and Gravitas ticketing platform (Next.js, Golang, SQL): a ticketing and checkout platform serving 65,000+ users per fest and 2M+ requests at near-zero downtime, with queue-based load management ahead of the payment gateways so flash-sale traffic did not break checkout.
- Yantra, an interactive 3D web experience (Next.js, Three.js, Blender, Tailwind, PostHog): optimised for low-end devices and weak networks, instrumented in PostHog, scaled to 100K+ visits.
- DSFFN, dual-stream deepfake detection (Python, PyTorch, EfficientNet-B0): a Dual-Stream Forgery Fusion Network combining spatial RGB and frequency-domain phase; trained and evaluated on 140,000 images; 90.12% accuracy, 98.01% AUC, 74.52% cross-domain accuracy, and a 5.05-point smaller generalisation gap.
- DropBy: brand identity and design system for a social discovery app (logo, type, colour, motion guidelines).
- Meal Maestro: AI-powered meal-planning app flows designed to reduce decision fatigue.

## Side projects on this site (the playground, /playground)
- Design Premier League: a browser cricket game for designers; face a full over and time your shots (/cricket).
- CAT Operator Assistant: his most recent project, a cab dashboard for heavy-machine operators built at a hackathon, with shift jobs planned around the weather, a job-time estimator and a fleet view. Case study: /work/cat-operator-assistant.
- Invoice Generator: a free freelance invoicing tool; no signup, nothing leaves the browser.
- Lotus Pond: a small pixel-art diorama with a frog and a pond (/frog).
- Contract Generator: a freelance contract drafting tool with editable clauses (/contract).
Other case studies on the site: Elevation Capital, Riviera, Fuzion, Gravitas and more; all work is at /work.

## Awards
- 1st place, Hexathon 2026, Google Developer Group (UI/UX designathon), as product designer / product lead on Bright Mint.
- Two-time winner of DevJams, Google Developer Group's hackathon: V-Rent, a campus rental and resale marketplace, and Trove, an AI travel assistant for solo travellers.
- Winner, No Code Nexus 2025 (Framer and Designare), first among 500+ participants for an interactive portfolio experience.

## Certifications
Google UX Design Certificate (Google); Generative AI using IBM watsonx (IBM); Geodata Processing using Python (ISRO).

## Skills
- Product design: wireframing, prototyping, high-fidelity UI, design systems, interaction design, information architecture, usability and A/B testing, user research and synthesis, journey mapping, design thinking, accessibility (WCAG).
- Product management: product strategy, PRDs and requirements, prioritisation, roadmap planning, KPI definition, GTM, agile/scrum, stakeholder management, competitive analysis, funnel and root-cause analysis, experiment design.
- Engineering: Java, C++, JavaScript, SQL, Python, HTML/CSS; React, Next.js, Three.js, Tailwind CSS, Framer Motion, Golang; MySQL; DSA, OOP, DBMS, OS, computer networks.
- Tools: Figma, Framer, Webflow, Adobe Creative Suite, Adobe XD, Sketch, Blender, Notion, Miro, PostHog, Google Analytics, Git.
`.trim();

export const SYSTEM_PROMPT = `You are Shotsu, the assistant on Aayush Raj's portfolio site. Visitors - often recruiters, founders and designers - ask you about Aayush, and you answer for him in the third person.

Answer only from the profile below. If something is not in it, say you don't know that and suggest emailing aayushvisuals@gmail.com or using the contact page. Never invent projects, numbers, employers, dates or opinions. Never share a phone number.

Style: warm, confident and brief. Two to four short sentences for most answers; a short list only when the visitor asks for several things. Plain text - no headings, no bold, no tables. When a page on this site is the best next step, link it as markdown with a relative path, for example [the CPGRAMS case study](/work/cpgrams) or [contact](/contact); do not write bare URLs for site pages.

If a visitor asks about something unrelated to Aayush or his work, answer in one line that you are here to talk about Aayush, and offer something you can help with. Personal questions (relationships, age, religion, money, where he lives, his phone number) get a light, friendly one-line decline and a redirect to his work.

<profile>
${PROFILE}
</profile>`;

/*
  Offline answers. Used when the site has no API key configured, or the
  API is unreachable, so the orb never answers with an error. Each entry
  is a set of trigger words and a reply; the first entry that matches
  wins, and the last is the catch-all.
*/
const OFFLINE: { words: string[]; reply: string }[] = [
  {
    words: ["single", "girlfriend", "boyfriend", "married", "relationship", "dating", "crush", "wife", "husband", "how old", "religion", "salary", "phone number", "home address"],
    reply:
      "That's a bit personal for me to answer - I stick to Aayush's work. Ask me about his projects, skills, experience or availability instead.",
  },
  {
    words: ["hire", "contact", "email", "reach", "available", "availability", "open to", "job", "role", "work with"],
    reply:
      "Aayush is open to full-time roles in product design and product management, and is available full time from January to June 2027 (happy to relocate to Bengaluru). The quickest way to reach him is aayushvisuals@gmail.com or the [contact page](/contact).",
  },
  {
    words: ["kpmg", "cpgrams", "government", "chatbot", "samadhan", "intern"],
    reply:
      "At KPMG India (GovTech), Aayush owned the conversational experience for CPGRAMS, the Government of India's grievance-redressal chatbot: speech-to-text intake, auto-filled forms, routing to the right ministry, 22+ languages, and a mascot called Samadhan Didi. Read [the CPGRAMS case study](/work/cpgrams).",
  },
  {
    words: ["recent", "latest", "cat", "caterpillar", "operator"],
    reply:
      "His most recent project is the CAT Operator Assistant, a cab dashboard for heavy-machine operators with weather-aware shift planning and a job-time estimator. See [the case study](/work/cat-operator-assistant).",
  },
  {
    words: ["project", "work", "portfolio", "case stud", "best"],
    reply:
      "A few highlights: CPGRAMS for the Government of India, the LayOver airport app taken 0 to 1, the Mike Tyson Invitational platform, and the Riviera festival identity and platform. Everything is on [the work page](/work).",
  },
  {
    words: ["skill", "stack", "tool", "figma", "react", "code", "tech", "engineer", "develop"],
    reply:
      "He designs in Figma and Framer and builds with React, Next.js, Three.js and Framer Motion, plus Java, C++, Python, SQL and Golang. He has shipped a ticketing platform serving 65,000+ users per fest and a 3D web experience with 100K+ visits.",
  },
  {
    words: ["study", "college", "education", "vit", "degree", "cgpa", "university"],
    reply:
      "Aayush is studying Computer Science and Engineering (B.Tech) at VIT Vellore, 2023 to 2027, with a CGPA of 8.23.",
  },
  {
    words: ["award", "win", "hackathon", "hexathon", "devjams", "prize"],
    reply:
      "He won 1st place at Hexathon 2026 (GDG), is a two-time DevJams winner (GDG), and won No Code Nexus 2025 by Framer and Designare, first among 500+ entries.",
  },
  {
    words: ["lead", "team", "manage", "mentor", "head"],
    reply:
      "He has led large teams: 75+ designers as Head of Design at E-Cell VIT, 100+ people as Design Manager for Riviera, and 30+ for Yantra.",
  },
  {
    words: ["game", "playground", "toy", "side project", "invoice", "contract", "pond", "cricket"],
    reply:
      "He builds side projects too: a cricket game, a pixel pond, and free invoice and contract tools. Try them in [the playground](/playground).",
  },
  {
    words: ["who are you", "shotsu", "what are you"],
    reply:
      "I'm Shotsu, Aayush's assistant. Ask me about his work, skills, experience or how to get in touch.",
  },
  {
    words: [],
    reply:
      "Aayush is a product designer and design engineer who designs and builds end to end, from research to shipped UI. Ask me about his experience, projects, skills or availability, or reach him at aayushvisuals@gmail.com.",
  },
];

/* whole-word match from the start of a word, so "lead" finds "leadership"
   but "age" would never fire on "manage" */
function mentions(q: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}`).test(q);
}

export function offlineAnswer(question: string): string {
  const q = question.toLowerCase();
  const hit = OFFLINE.find((o) => o.words.length === 0 || o.words.some((w) => mentions(q, w)));
  return (hit ?? OFFLINE[OFFLINE.length - 1]).reply;
}
