/*
  The About story's content, in one file.

  Everything the sequence below the hero renders comes from here, so the copy
  can be rewritten without touching a single layout or animation. The order of
  these exports is the order of the page: who I am, where it started, the
  journey, what I do, how I work, what came out of it, and a closing line.
*/

/* ---- 03 · Journey ---------------------------------------------------- */

export type Milestone = {
  /* the big number. Deliberately the loudest thing in the row. */
  year: string;
  title: string;
  copy: string;
  /* Art per year. The last entry closes the timeline on a real photograph
     rather than an illustration, so the run ends in the present tense. */
  image?: { src: string; alt: string };
};

export const MILESTONES: Milestone[] = [
  {
    year: "2020",
    title: "Visual Design",
    copy: "Lockdown was in full swing and, like every responsible teenager, I was spending most of my time playing games and watching YouTube. I started making gaming videos and reviews, which led to one very important problem: I wanted new skins and characters, and my parents did not believe in investing in my gaming career. So I learned Photoshop and made thumbnails, posters and banners for YouTubers to earn pocket money. The plan was to buy game skins. The unexpected side effect was that I started enjoying design.",
    image: { src: "/about/journey/luffy.webp", alt: "Illustration: a figure with arms raised" },
  },
  {
    year: "2021",
    title: "Wait, I actually like this?",
    copy: "What started as a way to fund my gaming habit slowly became a real thing. I started experimenting with motion graphics, branding and visual design, taking on freelance projects and working with real clients and a few well-known YouTubers. I was learning design the hard way: make something, realise it looks terrible, fix it, repeat. Somewhere in between all the terrible first drafts, I realised I might actually want to do this seriously.",
    image: { src: "/about/journey/naruto.webp", alt: "Illustration: a figure in an orange cloak" },
  },
  {
    year: "2022",
    title: "Getting curious",
    copy: "I was becoming less obsessed with making things look good and more curious about why they worked. I started exploring different areas of design and got increasingly interested in UI/UX. I began asking questions like “why is this button here?” and “why does this website make me angry?” — which, surprisingly, turned out to be useful questions for a designer.",
    image: { src: "/about/journey/sasuke.webp", alt: "Illustration: a figure with two swords" },
  },
  {
    year: "2023",
    title: "VIT happened",
    copy: "Then I joined VIT, and design got a lot more serious. I was introduced to UI/UX and product design and finally understood that design was not just about making pretty screens. Through Entrepreneurship Cell, Gravitas and Riviera I got to work with large teams, different stakeholders and very questionable deadlines. I also started leading design teams, which taught me that managing designers is sometimes harder than designing itself.",
    image: { src: "/about/journey/poster.webp", alt: "Poster illustration: painting over a wall" },
  },
  {
    year: "2024",
    title: "Designing more than screens",
    copy: "I started taking my design outside college and into actual products. At Canvas & Co. I worked as a product designer and creative strategist, while also exploring projects like the Mike Tyson Invitational website. I started thinking more about products, users and business problems instead of just individual screens. Basically, Figma stopped being a drawing app and became a place where I overthink everything.",
    image: { src: "/about/journey/suitcase.webp", alt: "Illustration: a sticker-covered case" },
  },
  {
    year: "2025",
    title: "Starting from zero",
    copy: "I became a founding product designer at a college startup, which meant there was no existing product, no established design system and definitely no magical “make it good” button. I helped take the product from zero to one and learned how to make design decisions when there is not always a perfect answer. I also worked on projects like the Elevation Capital AI Adoption Report, which taught me that making complicated information understandable is its own kind of design challenge.",
    image: { src: "/about/journey/signs.webp", alt: "Illustration: a cluster of road signs" },
  },
  {
    year: "2026",
    title: "Wait, people are actually using this?",
    copy: "More recently I joined KPMG as a summer intern and worked on CPGRAMS, designing a chatbot experience for filing grievances. The challenge was to simplify a fairly complex process for a very diverse group of users. And then something pretty cool happened: the first version went live. After years of making things inside Figma, I finally got to see something I designed actually being used by real people. Slightly terrifying. Mostly exciting.",
    image: { src: "/about/journey/zoro.webp", alt: "Illustration: a bound figure" },
  },
  {
    year: "Today",
    title: "Still figuring it out",
    copy: "Six years ago I started designing because I wanted to buy gaming skins. Today I am still designing, just with slightly better reasons. I have gone from thumbnails and posters to UI/UX, product design, startups and real-world products. I still love visuals and making things look good, but now I am equally obsessed with how things work, why they work and whether they can work better. I do not really have a perfect five-year plan. I just want to keep making interesting things, breaking them a little, fixing them, and seeing where that takes me.",
    image: { src: "/about/portrait-suit.webp", alt: "Aayush Raj today" },
  },
];

/* ---- 04 · What I do -------------------------------------------------- */

export type Discipline = {
  index: string;
  title: string;
  copy: string;
};

export const DISCIPLINES: Discipline[] = [
  {
    index: "01",
    title: "Product & UX strategy",
    copy: "Framing the problem, mapping the flows, and being honest about what should not get built. The cheapest screen is the one you talked yourself out of.",
  },
  {
    index: "02",
    title: "Design systems at scale",
    copy: "Token libraries that hold their shape when a second team picks them up. Naming, contracts, and the discipline to keep the exceptions out.",
  },
  {
    index: "03",
    title: "AI & intelligent interfaces",
    copy: "Conversational and assisted flows where the model is a material with real edges, not a feature bolted onto a form.",
  },
  {
    index: "04",
    title: "Research & delivery",
    copy: "Interviews that end in shipped screens. Research is only worth the hours if it changes what gets made.",
  },
  {
    index: "05",
    title: "Engineering & code",
    copy: "React, TypeScript and Framer Motion. I build the thing so nothing gets lost in the handoff — this site included.",
  },
];

/* ---- 05 · Approach --------------------------------------------------- */

export type Principle = { n: string; title: string; copy: string };

export const PRINCIPLES: Principle[] = [
  {
    n: "01",
    title: "Start with the constraint",
    copy: "The bandwidth, the language, the failing case, the person who is angry before the page loads. Design that ignores the constraint is decoration.",
  },
  {
    n: "02",
    title: "Build it to find out",
    copy: "A prototype answers in an afternoon what a review argues about for a week. I would rather be wrong in code than right in a slide.",
  },
  {
    n: "03",
    title: "Systems over screens",
    copy: "Anything worth designing twice is worth designing once properly. The second screen should cost a fraction of the first.",
  },
];

/* The tools, flattened to a reading line rather than a grid of logo cards.
   Which tool you use is a footnote; it does not deserve eight tiles. */
export const TOOLS: { group: string; items: string[] }[] = [
  { group: "Design", items: ["Figma", "Framer", "Photoshop"] },
  { group: "Build", items: ["VS Code", "Neovim", "React", "TypeScript"] },
  { group: "Motion", items: ["After Effects", "Premiere", "Framer Motion"] },
  { group: "Thinking", items: ["Claude", "NotebookLM", "Antigravity"] },
];

/* ---- 06 · Selected moments ------------------------------------------- */

export type Moment = {
  title: string;
  note: string;
  src: string;
  alt: string;
  /* controls which cell of the asymmetric grid it lands in */
  size: "wide" | "tall" | "small";
};

export const MOMENTS: Moment[] = [
  {
    title: "Gravitas",
    note: "Identity and platform for VIT's technical festival",
    src: "/projects/gravitas-cover.webp",
    alt: "Gravitas festival identity",
    size: "wide",
  },
  {
    title: "DropBy",
    note: "A delivery product, designed end to end",
    src: "/projects/dropby-cover.webp",
    alt: "DropBy product design",
    size: "small",
  },
  {
    title: "Elevation Capital",
    note: "Brand and interface work for a venture firm",
    src: "/projects/elevation-ai-cover.webp",
    alt: "Elevation Capital interface",
    size: "small",
  },
  {
    title: "Posterfolio",
    note: "A year of poster studies, collected",
    src: "/projects/posterfolio-cover.webp",
    alt: "Poster design collection",
    size: "tall",
  },
];

/* ---- 02 · Beginnings ------------------------------------------------- */

/* Education, told as what each step actually gave me rather than as a row of
   certificate cards. The year is the anchor; the line is the point. */
export const FORMATION: { year: string; place: string; gave: string }[] = [
  {
    year: "2023 —",
    place: "B.Tech, Computer Science · VIT Vellore",
    gave: "How software is actually built, which is why my handoffs survive contact with engineering.",
  },
  {
    year: "2024",
    place: "Google UX Design Certificate",
    gave: "The research craft, learned properly instead of picked up second-hand.",
  },
  {
    year: "2024",
    place: "Generative AI · IBM",
    gave: "Enough of the machinery to design with models rather than around them.",
  },
];
