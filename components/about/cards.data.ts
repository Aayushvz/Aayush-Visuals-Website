/*
  What the three info panels say.

  Split out of the component so the copy is one edit away and the markup stays
  a layout concern. All of it is drawn from facts the site already states
  elsewhere — the journey years, the CPGRAMS language count, the team size.
*/

export const GENERAL = {
  label: "General info",
  /* 960x1280, so the 5/6 frame crops a little off the top and bottom rather
     than off the sides — the subject is centred, so nothing important goes */
  portrait: { src: "/about/portrait-night.webp", alt: "Aayush Raj" },
  rows: [
    { k: "Based in", v: "India" },
    { k: "Started", v: "2020" },
  ],
};

export const STATS = {
  label: "By the numbers",
  rows: [
    { k: "Years designing", v: "06" },
    { k: "Completed projects", v: "15+" },
    { k: "Languages shipped", v: "22" },
    { k: "Visits served", v: "500K" },
  ],
};

export const CURRENT = {
  label: "Currently",
  role: "Product Designer & Design Engineer",
  /* the reference pairs two marks with a leaning rule between them; here that
     is the two halves of the job rather than a team and a sponsor */
  stack: ["Figma", "React"],
  highlight: {
    src: "/projects/cpgrams-cover.webp",
    alt: "CPGRAMS grievance platform",
    caption: "CPGRAMS · live, 2026",
  },
  status: "Open to full-time",
};
