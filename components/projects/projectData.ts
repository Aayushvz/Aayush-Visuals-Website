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
      /* Character art and reference sheets, not phone screens. The default
         frame crops to a 9:17.5 window because that is what a phone screen
         wants; a mascot in that frame is a tall slice of a saree. Compact
         halves the frame and lets the whole drawing show. */
      compact?: boolean;
    }
  /* two desktop screens side by side, uncropped. A surface with a dozen
     screens can't give every one of them a full-width frame or the section
     turns into a scroll endurance test; the primary screen gets the full
     width and the supporting ones pair up. */
  | {
      kind: "grid";
      /* `small` caps the frame for reference art like a component sheet,
         which does not need to be read at full width to make its point */
      items: { src: string; alt: string; label?: string; small?: boolean }[];
      caption?: string;
    }
  /* Art-direction boards, shown as a wall of candidates rather than a
     sequence. Deliberately not `grid`: these are whole 16:9 comps, so the
     browser chrome `grid` puts round an unflagged item would be claiming a
     type specimen is a live page, and the `small` escape hatch that avoids
     the chrome caps the frame at 200px, which is unreadable for a board with
     a headline on it.

     Each one carries its own note because a wall of four comps with a single
     caption underneath makes the reader guess which sentence belongs to
     which picture. `chosen` marks the survivor the same way the type trials
     in this file do — the section should not need a sentence to say which. */
  | {
      kind: "directions";
      items: {
        src: string;
        alt: string;
        label: string;
        note: string;
        chosen?: boolean;
      }[];
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
    }
  /*
    The whole case study on one screen, before any of it.

    A long-form page asks for twenty minutes before it tells you whether it
    is worth twenty minutes. This is the answer up front: what it was, what
    was wrong, what was hard, what got decided, what happened, what it
    taught — a line or two each. Somebody who reads only this block should
    still be able to say what the project was and what it cost to do.

    Ordered as authored rather than by a fixed schema, so a project whose
    story does not have "constraints" in it simply does not list one.
  */
  | {
      kind: "brief";
      items: {
        /* Problem, Constraints, Decision … one or two words */
        label: string;
        /* one or two lines, no more — this is the summary, not the section */
        body: string;
        /* stretches the card across the row; use it for the overview */
        wide?: boolean;
      }[];
    }
  /*
    One beat of a flow: the screens that make it, and what they decide.

    A twelve-screen grid under a four-paragraph essay makes the reader hold
    all twelve in their head while the prose catches up, and nobody does —
    they scroll the images and skip the text. Two screens at a time with
    their own explanation underneath means the argument is always next to
    the evidence for it, and the section can be read a beat at a time.

    Two is the deliberate limit. Three fits on the row and immediately
    becomes a gallery again.
  */
  | {
      kind: "step";
      items: { src: string; alt: string; label?: string }[];
      body: string[];
    }
  /*
    The decisions, as cards rather than a list.

    `numbered` is the right shape for findings — things that were observed,
    in the order they were found. A decision is not a finding. It has a
    ruling and a reason, and the ruling is the part somebody skimming the
    page should be able to read on its own. So it gets a card, the ruling
    gets the type size, and the reason sits underneath it.
  */
  | {
      kind: "decisions";
      items: {
        /* the ruling, in the imperative — "Never ask for the ministry" */
        label: string;
        /* why, and what it cost */
        body: string;
        /* the thing it is a decision ABOUT, as a one- or two-word tag */
        tag?: string;
      }[];
    }
  /*
    A palette, at a size where the colours are the content.

    `specs` renders a colour as a 12px chip beside its hex, which is the
    right weight for a spec table and the wrong weight for the section that
    is about the palette. These tiles are big enough to actually judge a
    colour against the one beside it, which is the only reason to put a
    palette on a page at all.
  */
  | {
      kind: "palette";
      items: { name: string; hex: string; use: string }[];
      caption?: string;
    }
  /* Typefaces, set in themselves. A row saying "Interface — Inter" tells
     you nothing a specimen does not tell you better. */
  | {
      kind: "typeset";
      items: {
        name: string;
        family: string;
        use: string;
        /* what to set in it; a script face should show its own script */
        sample: string;
        /* the CSS stack to render the sample in, when the site loads it */
        stack?: string;
      }[];
      caption?: string;
    }
  /*
    The outcome, as figures with their provenance attached.

    Deliberately carries `projected` per item rather than a footnote under
    the block: a projection presented in the same type as a result is the
    single most common dishonesty in a portfolio, and the label has to sit
    on the number itself for the reader to catch it.
  */
  | {
      kind: "results";
      items: { value: string; label: string; note?: string; projected?: boolean }[];
      caption?: string;
    }
  /* What the work taught, one lesson per block. Reflection is normally
     three paragraphs of grey that nobody finishes; these are three claims,
     each with its own heading and room around it. */
  | {
      kind: "lessons";
      items: { title: string; body: string }[];
    }
  /*
    A screen in a browser, with the walkthrough attached.

    `screens` is the right shape for a static frame with a paragraph. This
    exists for the two things that one cannot do: it takes VIDEO, and it
    puts whatever it is given inside a browser chrome.

    The chrome is drawn in CSS rather than composited into the asset, for
    the same reason the wireframes and the flow boards in this file are
    drawn — an exported mockup bakes its own dimensions, its own shadow and
    its own light/dark decision into a bitmap, and then disagrees with the
    page it sits on the first time either changes. Drawn, it costs nothing,
    it themes with everything else, and the address bar can carry the real
    URL, which is the one piece of information a mockup can add that the
    screenshot cannot.

    `src` decides the element: `.webm` renders a muted looping video, every
    other extension renders an image. Same field, because the call site
    should be saying "here is the thing to show", not "here is which tag to
    use for it".
  */
  | {
      kind: "mockup";
      /*
        Which device the thing is shown inside. Screen recordings get the
        laptop, because a full-page scroll is something you watch on a
        machine and the lid gives it somewhere to sit; single screens get
        the browser, which is a tighter frame that does not waste 200px of
        bezel on a static image.
      */
      frame?: "laptop" | "browser";
      items: {
        /** .webm plays as a loop; anything else renders as an image */
        src: string;
        /** the still under a loop, shown until it is decoded and on screen */
        poster?: string;
        alt: string;
        /** what the address bar reads. Omit for a surface with no URL. */
        url?: string;
        /** the small ordinal above the title — "01", "Home", "Flow" */
        step?: string;
        title: string;
        body: string;
      }[];
    }
  /*
    The information architecture, as a tree rather than a screenshot.

    A sitemap is the one artefact in a project that is pure structure, and a
    picture of somebody's Figma board is the worst way to show structure:
    it arrives at whatever zoom it was exported at, its type is not the
    page's type, and it cannot reflow, so on a phone it becomes a 3589px
    image scaled to illegibility.

    Rebuilt as nested lists it reads at any width, the labels are real text
    a screen reader can walk, and it inherits the accent — so the same tree
    is drawn in the project's own colour rather than in Figma's greys.
  */
  | {
      kind: "sitemap";
      nodes: SitemapNode[];
      caption?: string;
    }
  /*
    A typeface trial, rebuilt from the design file rather than screenshotted.

    Two shapes, because two different questions were being asked. `display`
    is the headline bake-off: one face per card, set huge, nothing else on
    it. `pairing` is the second round, where the headline was already
    settled and the body face underneath it was the variable.

    A face is drawn one of two ways. `stack` sets it as live type, which is
    what you want whenever the web can load the face. `svg` points at vector
    outlines exported from the design file, for the faces it cannot — Legend
    and OneTwoHours are not webfonts, and a specimen set in a lookalike is
    worse than no specimen at all, because it is a confident claim about
    letterforms nobody actually chose.
  */
  | {
      kind: "typetrial";
      variant: "display" | "pairing";
      items: {
        face: string;
        /*
          Vector outlines of the headline sample, for non-web faces. Drawn as
          a CSS mask rather than an <img>: an SVG loaded through <img> is its
          own document and cannot see the page's `color`, so `currentColor`
          inside it resolves to black and the specimen disappears into the
          black card. A mask takes its shape from the file and its colour
          from `background`, which is the only way to get one file that works
          in both themes and in a chosen/unchosen state.

          `ratio` is width / height of the file's viewBox. A mask has no
          intrinsic size, so without it the box collapses.
        */
        svg?: string;
        ratio?: number;
        /** the numeral specimen that sits in the right column */
        numerals?: string;
        numeralsRatio?: number;
        /** live CSS stack, for faces the web can load */
        stack?: string;
        /** the body sample's stack, for pairing trials */
        bodyStack?: string;
        note?: string;
        /** the one that survived; drawn with the accent rather than grey */
        chosen?: boolean;
      }[];
      caption?: string;
    };

/* one page in the tree; `note` is the integration or the caveat hanging off
   it, which is most of what a sitemap is actually communicating */
export type SitemapNode = {
  label: string;
  note?: string;
  children?: SitemapNode[];
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
  /*
    Which side of the light/dark switch this project's case study opens on.

    Case studies default to light because most of them are screenshots of
    light interfaces and a dark canvas around those fights the thing the
    page exists to present. A project designed dark has the opposite
    problem: a near-black event site inside a parchment page reads as a
    mistake, and every screenshot on it becomes a hole punched in the
    layout. So the default is a default, not a rule.

    This sets where the page STARTS. The dock's toggle still works from
    either value, and neither this nor the pre-paint script writes to
    localStorage, so the reader's preference for the rest of the site
    survives a visit here untouched.
  */
  theme?: "dark" | "light";
  /** case-study gallery. Without it the page falls back to `cover` alone. */
  shots?: ProjectShot[];
  /** long-form body. When present it renders instead of the flat `shots`
      gallery — see CaseBlock above. */
  sections?: ProjectSection[];
  /*
    Draws the macOS browser window — traffic lights and an address bar —
    around the screens in `grid`, `step` and `mockup` blocks.

    Opt-in, and off by default, because the frame is a claim: it says the
    thing inside it is a page in a browser. That is true of a website case
    study and false of a poster wall or a set of app screens, where the
    chrome was reading as a title bar bolted onto artwork that never lived
    in a browser.
  */
  browserFrames?: boolean;
  /*
    Overrides the case-study accent for this project only, so a piece of
    work can be read in its own brand colour instead of the site purple.
    Two values because one hue almost never clears 4.5:1 on both a #1e1e1e
    and a #ffffff canvas — the light entry is normally a darker shade of
    the same hue.

    `bright` is the loud end of the same hue, for surfaces the eye is meant
    to find rather than read through: the collaborator cursor, its name tag,
    the comment pins, the selection highlight. `ink` is what stays legible
    sitting ON that — a saturated orange takes dark text, a deep purple
    takes white — and defaults to white when a project does not say.

    `fill` is what a whole surface turns when it fills with the accent, as
    the overview cards do on hover. It defaults to the deepest value in the
    set, because that is the only one white reliably reads on; a project
    that would rather be loud than legible there can name its own.
  */
  accent?: {
    dark: string;
    light: string;
    solid?: string;
    bright?: string;
    ink?: string;
    fill?: string;
    /* what a heading turns on hover. Defaults to `solid`; a project whose
       brand colour is too close to the body text can name a second one. */
    hover?: string;
    /* the foreground once a card has filled with `fill`. Defaults to white,
       which only works while `fill` is dark enough to carry it. */
    fillInk?: string;
  };
};

export const PROJECTS: Project[] = [
  {
    id: "mike-tyson-invitational",
    title: "Mike Tyson Invitational",
    /* the only case study whose screens really are a browser: every frame in
       it is a page of a site you can go and load */
    browserFrames: true,
    logoText: "MTI",
    logoUrl: "/projects/mike-tyson-logo.webp",
    /* the card loops rather than sits still; `cover` stays a still and doubles
       as the poster, so the frame is filled before the loop arrives */
    bgVideoUrl: "/projects/mike-tyson-bg.webm",
    category: "Website Design",
    year: "2026",
    cover: "/projects/mike-tyson-poster.webp",
    /* a shipped site AND a long-form deep dive, so it is listed as both
       rather than moved out of the projects grid */
    alsoCaseStudy: true,
    /*
      Opens light, like every other case study.

      The site being near-black argued for a dark page, and that is what this
      shipped as first. It was wrong: the screenshots carry their own
      darkness now that the browser chrome around them is dark too, so they
      read as objects sitting ON a light page rather than holes punched in
      it. The `theme` field stays on the Project type for the next project
      that genuinely needs it.
    */
    preview: {
      kind: "website",
      href: "https://mike-tyson-invitational-3821139c156afc7.webflow.io/",
      image: "/projects/mike-tyson-poster.webp",
    },
    cta: "Visit Live Website",
    role: "Design & Build",
    tools: ["Webflow", "Figma", "Motion"],
    /*
      The Smelting palette, straight off the design system.

      `dark` is the orange rather than the red: #F72C25 is the brand's loud
      value and it measures about 3.5:1 on this canvas, which is fine for a
      button and not fine for the small caps labels the accent is mostly
      used on here. #FF8D3C is the next stop up the same ramp and clears 6.8:1.
      `bright` keeps the real red for the surfaces meant to be found rather
      than read, and `fill` is the deepest ember, which is the only one in
      the set white sits on cleanly.
    */
    /*
      `bright` paints the collaborator cursor, its name tag and the comment
      pins — objects that float over every screenshot on the page. At
      #F72C25 that cursor was the loudest thing on screen and pulled the eye
      off the work it was sitting on top of. It drops to the deep ember,
      which still reads as this project's colour without competing with a
      hero it happens to be hovering.
    */
    accent: {
      dark: "#FF8D3C",
      light: "#C41E18",
      solid: "#F72C25",
      bright: "#8E1F14",
      ink: "#FFFFFF",
      fill: "#450503",
    },
    description:
      "A high-impact tournament site for the Mike Tyson Invitational, built for momentum, clarity and a heavyweight first impression.",
    highlights: [
      "Countdown-driven landing built around a hard launch deadline",
      "Custom Webflow interactions tuned for mobile performance",
      "Ticketing flow simplified into a single frictionless path",
    ],
    extraFacts: [
      ["Surfaces", "10 pages"],
      ["Typefaces", "Legend, Chakra Petch, IBM Plex Sans"],
    ],
    sections: [
      {
        name: "Overview",
        heading: "Iron forge meets modern tech",
        blocks: [
          {
            kind: "brief",
            items: [
              {
                label: "Project",
                wide: true,
                body:
                  "The first Mike Tyson Invitational, a three day amateur boxing event in Las Vegas. Ten pages covering tickets, fighter registration, sponsorship, donations and a live stream. Designed and built end to end.",
              },
              {
                label: "Problem",
                body:
                  "Forge wants texture, heat and grit. Tech wants cold, flat and exact. Both at full volume is a mess with a fire filter on it.",
              },
              {
                label: "Decision",
                body:
                  "Ratio, not blending. 65% near black, 25% smelting orange, no more than 10% cold teal.",
              },
              {
                label: "Honestly",
                body:
                  "First project at this size, with a name on the door that leaves no room for a shrug. I was nervous the whole way.",
              },
            ],
          },
        ],
      },

      {
        name: "Exploration",
        heading: "Finding a face that could throw a punch",
        blocks: [
          {
            kind: "prose",
            body: [
              "Before any of that, four boards to find out how far the forge could go before it stopped looking like a sport and started looking like a filter.",
            ],
          },
          {
            kind: "directions",
            items: [
              {
                src: "/projects/mike-tyson/direction-components.webp",
                alt: "A direction board titled Headlines (Muscle - Force & Discipline), showing one content card in three densities over a dark arena plate, each with an ember gradient rail down its left edge and a red cut-corner outline on the headline.",
                label: "01 · Forge, on a component",
                note: "The heat tested on a real card rather than a headline: ember rail, cut corners, a stamped date. Three densities of the same component, because the one carrying body copy is the one that has to survive.",
              },
              {
                src: "/projects/mike-tyson/direction-atmosphere.webp",
                alt: "A direction board with a large Legend headline in off-white over an almost black architectural photograph, with teal halftone numerals reading 721 in the lower left.",
                label: "02 · Cold, atmospheric",
                note: "The opposite pole. Photography pushed nearly to black, teal numerals, no orange anywhere. Calm and expensive — and nothing in it throws a punch.",
              },
              {
                src: "/projects/mike-tyson/direction-portrait.webp",
                alt: "A hero board reading Forged in legacy. Built for the future, with a fighter lit by orange rim light on the right, supporting copy on the left and two buttons labelled Tickets and Explore.",
                label: "03 · Lit portrait",
                chosen: true,
                note: "A fighter carrying the heat instead of a texture doing it. This layout is what shipped — headline and body left, the figure right, Tickets solid against Explore outlined. The cold blue accent is the one thing that did not survive the palette ratio.",
              },
              {
                src: "/projects/mike-tyson/direction-graphic.webp",
                alt: "A direction board with no photograph: a Legend headline over flat dark teal shards, with ember gradient diagonal lines and a red circled node at the right edge.",
                label: "04 · Flat graphic",
                note: "The tech pole with the photography removed entirely — shards, a trajectory line, a circled node. It reads like a product launch, not a fight card.",
              },
            ],
            caption:
              "Boards 02 and 04 are the two ends of the same argument, and both lose for the same reason: the event is a person, not a mood. **03 wins the layout, 01 wins the detailing**, and the palette ratio settles what happens when the two meet.",
          },
          {
            kind: "prose",
            body: [
              "Round one: three display faces, same sample, nothing else on the card.",
            ],
          },
          {
            kind: "typetrial",
            variant: "display",
            items: [
              {
                face: "Legend",
                svg: "/projects/mike-tyson/face-legend.svg",
                ratio: 1441 / 561,
                numerals: "/projects/mike-tyson/face-legend-721.svg",
                numeralsRatio: 651 / 360,
                chosen: true,
                note: "Flat sides, hard corners, and numerals that look stamped rather than drawn. The halftone in the digits is part of the face.",
              },
              {
                face: "OneTwoHours",
                svg: "/projects/mike-tyson/face-onetwohours.svg",
                ratio: 1513 / 585,
                note: "Cleaner and calmer. Reads as a tech conference, not a fight.",
              },
              {
                face: "Boldonse",
                stack: "var(--font-boldonse), sans-serif",
                note: "Heavy enough, but the rounded joints soften every corner.",
              },
            ],
          },
          {
            kind: "prose",
            body: [
              "Round two: Legend fixed on top, three body faces underneath it.",
            ],
          },
          {
            kind: "typetrial",
            variant: "pairing",
            items: [
              {
                face: "Oxanium",
                bodyStack: "var(--font-oxanium), sans-serif",
                note: "Two opinionated faces arguing. The headline stopped winning.",
              },
              {
                face: "Chakra Petch",
                bodyStack: "var(--font-chakra), sans-serif",
                note: "Right voice, wrong job. Great on numbers, tiring across a paragraph.",
              },
              {
                face: "IBM Plex Sans",
                bodyStack: "var(--font-plex), sans-serif",
                chosen: true,
                note: "Disappears under Legend and stays comfortable at length.",
              },
            ],
            caption:
              "Legend and OneTwoHours are drawn as vector outlines from the design file, since neither has a webfont. The rest is live type.",
          },
          {
            kind: "decisions",
            items: [
              {
                tag: "Type",
                label: "Three faces, one job each",
                body:
                  "Legend for headlines, IBM Plex Sans for reading, Chakra Petch for numbers and labels. Chakra Petch was too good at numerals to throw away.",
              },
              {
                tag: "Texture",
                label: "Texture lives in artwork, never in UI",
                body:
                  "Scratched metal and heat glow stay inside images and headline fills. Buttons, forms and body text stay flat.",
              },
            ],
          },
        ],
      },

      {
        name: "Design System",
        heading: "Three palettes and a ratio",
        blocks: [
          {
            kind: "prose",
            body: [
              "The palette is a budget. The percentages do the work, not the hex values.",
            ],
          },
          {
            kind: "palette",
            items: [
              { name: "Onyx Black", hex: "#060708", use: "Backgrounds, canvas, nav, footer" },
              { name: "Parchment", hex: "#F5F1EA", use: "Body text, outlines, dividers" },
            ],
            caption: "**Foundation, 65 to 70%.** Authority and depth. Most of the site is these two, quietly.",
          },
          {
            kind: "palette",
            items: [
              { name: "Ember", hex: "#450503", use: "Filled surfaces" },
              { name: "Smelting Red", hex: "#F72C25", use: "Primary CTAs, active states" },
              { name: "Heated Steel", hex: "#FF8D3C", use: "Highlights, glow" },
              { name: "Spark", hex: "#FFF893", use: "Rare accents, the hottest point" },
            ],
            caption: "**Accent, 20 to 25%.** The ramp runs in the order metal actually heats.",
          },
          {
            kind: "palette",
            items: [
              { name: "Gunmetal", hex: "#0F1317", use: "Background elements" },
              { name: "Slate", hex: "#162529", use: "Panels" },
              { name: "Patina", hex: "#294341", use: "Data labels" },
              { name: "Cold Steel", hex: "#3D6D67", use: "Numerals, timers, metallic tint" },
            ],
            caption: "**Cool tint, 5 to 10%.** The smallest budget, and the easiest one to overspend.",
          },
          {
            kind: "specs",
            items: [
              { name: "Primary button", value: "Notched corners, solid fill", note: "Tickets, Register, Donate", swatch: "#F72C25" },
              { name: "Secondary button", value: "Outline, parchment", swatch: "#F5F1EA" },
              { name: "Input height", value: "48px", note: "Dark fill, explicit focus state" },
              { name: "Field labels", value: "Above the input", note: "Never placeholder only" },
              { name: "Tags and status", value: "Chakra Petch, letter spaced", swatch: "#3D6D67" },
            ],
          },
          {
            kind: "statement",
            text:
              "Capping the teal at 10% is the only reason this reads as a forge with technology in it, rather than a tech site in an orange coat.",
          },
        ],
      },

      {
        name: "Sitemap",
        heading: "Ten surfaces, four of them someone else's software",
        blocks: [
          {
            kind: "sitemap",
            nodes: [
              { label: "Home" },
              { label: "Tickets", children: [{ label: "Event Schedule" }, { label: "TicketTailor", note: "External" }] },
              { label: "Event Info", children: [{ label: "Event Schedule" }] },
              { label: "Get Involved", children: [{ label: "Sponsorship Tiers" }, { label: "Sponsor Inquiry", note: "Form" }] },
              { label: "Fighter Registration", note: "Form" },
              { label: "Donations", children: [{ label: "Donorbox", note: "External" }] },
              { label: "Merch / Shop", children: [{ label: "Shopify", note: "Planned" }] },
              { label: "Watch Live", children: [{ label: "Streaming Hub" }] },
              { label: "Media / Gallery" },
              { label: "Legal", children: [{ label: "Privacy" }, { label: "Terms" }, { label: "Refunds" }] },
            ],
            caption:
              "Checkout runs through TicketTailor, Donorbox and Shopify, so most of the job is the run up to the handoff. Merch was scoped for after the products and sponsor tiers were locked, but sits in the architecture from day one so navigation never needs rebuilding around it.",
          },
        ],
      },

      {
        name: "Homepage",
        heading: "The first three seconds",
        blocks: [
          {
            kind: "mockup",
            frame: "laptop",
            items: [
              {
                src: "/projects/mike-tyson/homepage.webm",
                poster: "/projects/mike-tyson/homepage-poster.webp",
                url: "miketysoninvitational.com",
                step: "01",
                title: "One scroll, six jobs",
                body:
                  "Sell a ticket, explain a format nobody has seen, register fighters, court sponsors, take donations, announce a date. It resolves as a descent: heat at the top, information in the middle, invitation at the bottom.",
                alt: "Screen recording scrolling the homepage from hero to footer",
              },
            ],
          },
          {
            kind: "step",
            items: [
              {
                src: "/projects/mike-tyson/home-hero.webp",
                alt: "Homepage hero with the headline in smelting red over a portrait lit with flame",
                label: "Hero",
              },
              {
                src: "/projects/mike-tyson/home-date-reveal.webp",
                alt: "MARCH 12-14 LAS VEGAS in Legend, filled with brushed metal inside a bracketed frame",
                label: "Date reveal",
              },
            ],
            body: [
              "The hero is the whole thesis: near black, headline in smelting red, one ember of heat carrying the right side. The cursor is a crosshair that glows, which is where the tech half stops being a colour and becomes a behaviour.",
              "The date gets a full screen, filled with brushed metal and framed in corner brackets. Forge for the texture, HUD for the frame. It is the frame I am happiest with.",
            ],
          },
          {
            kind: "step",
            items: [
              {
                src: "/projects/mike-tyson/home-about.webp",
                alt: "The Invitational section with a cyan wireframe figure and copy about AI powered broadcast",
                label: "The format",
              },
              {
                src: "/projects/mike-tyson/navbar.webp",
                alt: "Full screen navigation portal with eight destinations set large in Legend",
                label: "Navigation",
              },
            ],
            body: [
              "The one place cold teal runs: the section about AI broadcast and real time power measurement. The tech palette appears where the copy is about technology and nowhere else.",
              "Eight destinations with no obvious ranking between Buy Tickets and Registration, so a horizontal bar would have had to invent one. The portal sets all eight at a size that says each matters.",
            ],
          },
        ],
      },

      {
        name: "About",
        heading: "The part that had to earn the name",
        blocks: [
          {
            kind: "mockup",
            frame: "laptop",
            items: [
              {
                src: "/projects/mike-tyson/about.webm",
                poster: "/projects/mike-tyson/about-poster.webp",
                url: "miketysoninvitational.com/about",
                step: "02",
                title: "Legacy without the highlight reel",
                body:
                  "The easy version is a montage of famous knockouts. That is someone else's story and it does not explain why an amateur invitational exists. This runs on one line instead: legacy did not end in the ring, it continued through transformation.",
                alt: "Screen recording scrolling the About page",
              },
            ],
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/mike-tyson/about-page.webp",
                alt: "The Evolution hero on the About page, a portrait lit from behind in red and orange",
                label: "The Evolution",
              },
              {
                src: "/projects/mike-tyson/vision.webp",
                alt: "The Vision Behind The Invitational section in orange and cream over deep red",
                label: "The Vision",
              },
            ],
            caption: "The only two frames that run the accent over budget, deliberately.",
          },
        ],
      },

      {
        name: "Tickets",
        heading: "Handing off to someone else's checkout",
        blocks: [
          {
            kind: "mockup",
            frame: "laptop",
            items: [
              {
                src: "/projects/mike-tyson/tickets.webm",
                poster: "/projects/mike-tyson/tickets-poster.webp",
                url: "miketysoninvitational.com/events",
                step: "03",
                title: "Three nights, three states",
                body:
                  "Ticketing runs through TicketTailor, so the design job ends at the handoff. Sale status sits on the pages before the jump, so nobody reaches an external checkout to discover the thing they wanted is not purchasable yet.",
                alt: "Screen recording of the tickets page showing the three nights and their sale states",
              },
            ],
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/mike-tyson/event-dates.webp",
                alt: "Three date cards for March 12, 13 and 14 with sale status labels",
                label: "Dates and status",
              },
              {
                src: "/projects/mike-tyson/ticket-design.webp",
                alt: "Physical ticket artwork with a portrait, chains, rivets and the Las Vegas sign",
                label: "Physical ticket",
                small: true,
              },
            ],
            caption:
              "Status is set in Chakra Petch, which is why that face survived the trials. The printed ticket lets the forge half go all the way, because print has no legibility budget to protect.",
          },
        ],
      },

      {
        name: "Get Involved",
        heading: "Selling to sponsors, not to fans",
        blocks: [
          {
            kind: "mockup",
            frame: "laptop",
            items: [
              {
                src: "/projects/mike-tyson/sponsorship.webm",
                poster: "/projects/mike-tyson/sponsorship-poster.webp",
                url: "miketysoninvitational.com/sponsorships",
                step: "04",
                title: "A different reader entirely",
                body:
                  "Every other page talks to someone who wants to watch a fight. This one talks to someone with a marketing budget, who needs structure and numbers rather than atmosphere. It is the most restrained page on the site, and the restraint is the pitch.",
                alt: "Screen recording of the sponsorship page scrolling through the tiers",
              },
            ],
          },
          {
            kind: "mockup",
            frame: "browser",
            items: [
              {
                src: "/projects/mike-tyson/sponsorship-packages.webp",
                alt: "Sponsorship packages section with heavyweight, middleweight and red/blue corner tiers",
                url: "miketysoninvitational.com/sponsorships",
                title: "Named in the sport's own language",
                body:
                  "Heavyweight, Middleweight, Red and Blue Corner. The hierarchy reads before any number does.",
              },
            ],
          },
        ],
      },

      {
        name: "Fighter Registration",
        heading: "The longest form on the site",
        blocks: [
          {
            kind: "mockup",
            frame: "laptop",
            items: [
              {
                src: "/projects/mike-tyson/fighter-registration.webm",
                poster: "/projects/mike-tyson/fighter-registration-poster.webp",
                url: "miketysoninvitational.com/registration",
                step: "05",
                title: "Ask a fighter for their record",
                body:
                  "Gym, date of birth, bout record, fight weight. Every one of those is a reason to abandon, so the page opens with an explicit promise about what happens next. A long form only gets finished when the reader knows why each field is there.",
                alt: "Screen recording of the fighter registration page and form",
              },
            ],
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/mike-tyson/registration-hero.webp",
                alt: "Mike Wants You hero with apply now and event details buttons",
                label: "The ask",
              },
              {
                src: "/projects/mike-tyson/registration-form.webp",
                alt: "Registration form with name, gym, date of birth, gender, record and weight fields",
                label: "The form",
              },
            ],
            caption:
              "Labels sit above the fields. That rule matters most here, where someone entering a bout record cannot afford to lose the label the moment they start typing.",
          },
        ],
      },

      {
        name: "Donations",
        heading: "Asking without the guilt trip",
        blocks: [
          {
            kind: "mockup",
            frame: "laptop",
            items: [
              {
                src: "/projects/mike-tyson/donation.webm",
                poster: "/projects/mike-tyson/donation-poster.webp",
                url: "miketysoninvitational.com/donation",
                step: "06",
                title: "Support the mission",
                body:
                  "Donations route out to Donorbox, so again the job is the run up. It is the reddest page on the site, and the only one asking for something with nothing tangible going back.",
                alt: "Screen recording of the donation page",
              },
            ],
          },
        ],
      },

      {
        name: "Reflection",
        heading: "What a first big one teaches you",
        blocks: [
          {
            kind: "lessons",
            items: [
              {
                title: "A ratio is a design decision",
                body:
                  "Writing **65 / 25 / 10** next to the palettes did more than any single colour choice. Two clashing directions stop clashing once one is rationed, and a written number let me tell whether a screen was wrong instead of just feeling it.",
              },
              {
                title: "Scope integrations before designing around them",
                body:
                  "The pages that went smoothly were the ones where I knew the checkout belonged to someone else. The ones that hurt were where I had already drawn one.",
              },
              {
                title: "Nervous is not unprepared",
                body:
                  "The anxiety was about the name on the door, not the work. Exploration, palette ratios and the sitemap were all settled before a page was designed, and that is what carried it.",
              },
            ],
          },
        ],
      },
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
    /* the product's own orange. #FE700E measures 5.98:1 on the dark canvas
       but only 2.79:1 on white, so light-mode TEXT drops to a deeper shade
       of the same hue. `solid` stays the true brand orange in both themes
       and is used only for hover borders and rings, where the 3:1 UI bar
       applies rather than the 4.5:1 text bar. */
    accent: {
      dark: "#FE700E",
      light: "#B35709",
      /* the palette's own Saffron, the same value the design-system section
         documents — so borders, rings, the frame ticks and the heading
         hover all land on the colour the product actually ships */
      solid: "#FE6700",
      /* the cursor, its tag, the comment pins and the selection highlight
         are meant to be spotted, not read through, so they run hotter than
         the body accent. White on this measures 2.3:1, hence the dark ink. */
      bright: "#FF7A1A",
      ink: "#2A1000",
      /* the product's own saffron, and the deliberate choice to keep filled
         surfaces on brand rather than dropping to the deeper shade white
         would read better on */
      fill: "#FE6700",
    },
    title: "CPGRAMS",
    logoText: "CPGRAMS",
    category: "Product Design",
    year: "2026",
    cover: "/projects/cpgrams-cover.webp",
    preview: { kind: "website", href: "https://pgportal.gov.in/Signin", image: "/projects/cpgrams-cover.webp" },
    cta: "Visit Live Chatbot",
    role: "Product Design · Conversational UX",
    tools: ["Figma", "Conversational UX", "Prototyping"],
    description:
      "CPGRAMS is how a citizen of India formally complains to their own government: 20 lakh grievances a year across 90+ ministries, filed through a 15-field form in English or Hindi. This is a conversational layer over it. You speak your problem in your own language and the chatbot files it, routed and categorised, without you ever seeing the form.",
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
        name: "overview",
        heading: "The short version",
        blocks: [
          {
            kind: "brief",
            items: [
              {
                label: "What it is",
                wide: true,
                body: "A **conversational layer** over India's national grievance system. Describe your complaint out loud in any of **22 languages** and the chatbot files it: categorised, routed and legally identical to a form submission.",
              },
              {
                label: "The problem",
                body: "Filing required naming which of **90+ ministries** owned your problem, in English or Hindi, on a desktop form. **Six in ten people abandoned it.**",
              },
              {
                label: "Key challenges",
                body: "The government's **taxonomy could not change**, a quarter of the audience **cannot read or write**, and it had to work on a 2G phone.",
              },
              {
                label: "Key decisions",
                body: "**Infer the ministry**, never ask for it. Detect the language instead of offering a list. **Show the interpretation before filing.**",
              },
              {
                label: "Outcome",
                body: "Live at cpgramsaichatbot.com. Filing now asks for **speech**, not literacy plus filing knowledge.",
              },
              {
                label: "What I learned",
                body: "Accessibility **was** the product, not a layer on it. Automation that hides its reasoning is **exposure, not convenience**.",
              },
            ],
          },
        ],
      },
      {
        name: "problem",
        heading: "A working system with the wrong door",
        blocks: [
          {
            kind: "prose",
            body: [
              "CPGRAMS is a statutory commitment. Any citizen can lodge a grievance against any central department and an officer must answer it. **90+ ministries**, **20 lakh grievances a year**, **93%** disposed. The machinery works.",
              "The door does not. Reaching it means a **15-field form** whose second field asks which ministry and category your problem belongs to: a **filing decision**, demanded before you have described anything.",
            ],
          },
          {
            kind: "flow",
            steps: [
              { label: "Open the portal", sub: ["Desktop-first", "English or Hindi"] },
              { label: "Register", sub: ["Mobile number or email", "Before anything can be described"] },
              {
                label: "Pick the ministry",
                decision: true,
                sub: ["One of 90+", "Asked before the problem is stated"],
              },
              {
                label: "Pick the department and category",
                decision: true,
                sub: ["The portal's taxonomy", "Not the citizen's words"],
              },
              { label: "Describe the grievance", sub: ["In writing", "In formal language"] },
              { label: "Attach documents", sub: ["Which ones is never said up front"] },
              { label: "Submit", sub: ["Clear a CAPTCHA", "Beat the session timeout"] },
              {
                label: "Receive a registration number",
                sub: ["Track the status with it", "An officer must reply in 30 to 60 days"],
              },
            ],
            caption:
              "Eight steps, and the two a citizen is least equipped for sit at **three and four**. The classification is demanded **before the problem is described**, which is the wrong order for anyone who does not already know how government files things.",
          },
          {
            kind: "stats",
            items: [
              { value: "20L+", label: "grievances filed every year" },
              { value: "90+", label: "central ministries and departments covered" },
              { value: "30-60", label: "days an officer has to respond, by mandate" },
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "You must already know the answer to use it",
                body: "The people least able to **classify their own problem** are the ones the system exists for.",
              },
              {
                label: "Built for a machine most users do not own",
                body: "Desktop-first in a country that is **three quarters mobile**, with a **CAPTCHA** that defeats the age group filing most grievances.",
              },
              {
                label: "Two languages out of twenty-two",
                body: "More than **550 million citizens** think in a regional language the portal cannot read.",
              },
              {
                label: "One mistake and the work is gone",
                body: "**Session timeouts** wipe everything. No autosave, no drafts, no recovery path.",
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
              "**Six in ten people who start a grievance never finish it**, so the state never hears from them at all.",
          },
          {
            kind: "coverage",
            total: 22,
            filled: 2,
            label: "scheduled Indian languages supported by the portal",
            note: "Every dark cell is a language the Constitution recognises and the interface does not.",
          },
          {
            kind: "statement",
            text: "A channel built for **1.4 billion people** was, in practice, being used by the **top 15%**.",
          },
        ],
      },
      {
        name: "insight",
        heading: "The reframe",
        blocks: [
          {
            kind: "statement",
            text: "People were not failing to file grievances. They were failing to **fill in a form**. Only one of those is the citizen's problem.",
          },
          {
            kind: "prose",
            body: [
              "That moves the work from redesigning the portal to building a **translation layer** over it. Same ministries, same categories, same **statutory clock**. The complexity does not disappear, it **moves out of the citizen and into the system**, which is the one place that already knows how government is organised.",
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
              "Same grievance, same destination, same **legal weight**. The redesign moves the knowledge of how government is organised **from the citizen to the software**.",
          },
        ],
      },
      {
        name: "constraints",
        heading: "Constraints, and what they ruled out",
        blocks: [
          {
            kind: "prose",
            body: [
              "Two fixed constraints: the government's **taxonomy could not change**, and the audience **could not be assumed to read**. Together they rule out the obvious move, since a cleaner form is still a **reading test with a filing test attached**.",
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
          {
            kind: "numbered",
            items: [
              {
                label: "Move the cognitive load, do not reduce it",
                body: "The **cognitive load** is real. It can only move from the citizen to the **software**.",
              },
              {
                label: "Progressive disclosure over a single page",
                body: "**One question at a time** keeps **working memory** free for the answer.",
              },
              {
                label: "Input parity, output parity",
                body: "Accepting voice but replying only in text solves the wrong half.",
              },
              {
                label: "Automation needs a consent surface",
                body: "The system files on your behalf, so it must **show its interpretation before committing**.",
              },
            ],
          },
          {
            kind: "statement",
            text: "Every screen had to solve its problem in the **minimum number of clicks**.",
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
              "You do not wireframe a chatbot the way you wireframe a page. There is no fixed layout, only a **sequence of states** and what each one may ask for. Four **greyboxes** settled it.",
            ],
          },
          {
            kind: "wireframes",
            items: [
              {
                layout: "entry",
                label: "01 Entry",
                note: "**One primary action**, centred. History rail kept from the portal so **returning users recognise it**.",
              },
              {
                layout: "listen",
                label: "02 Capture",
                note: "**Live feedback** while recording. A static indicator does not reassure a first-time user.",
              },
              {
                layout: "chat",
                label: "03 Thread",
                note: "Alternating turns, input pinned. **Every message persists** so a dropped session is not a lost grievance.",
              },
              {
                layout: "review",
                label: "04 Review",
                note: "Interpretation, detected tag, primary and secondary action. The **consent surface**.",
              },
            ],
            caption:
              "Low fidelity on purpose. Greyboxes keep the argument on **structure**, the only thing these were deciding.",
          },
        ],
      },
      {
        name: "layout",
        heading: "Where everything sits, and why",
        blocks: [
          {
            kind: "prose",
            body: [
              "The shell is deliberately the one people already know from government portals: a rail on the left, an account control top right, an input along the bottom. **Recognition was worth more than novelty**, because the thing this has to overwrite is the visitor's last experience of a .gov.in site. Inside that familiar frame, only one element is allowed to be loud.",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "Centre: press to speak",
                body: "The primary action takes the **optical centre and the largest target on the page**. A first-time user should not have to look for it, and someone who cannot read the label can still find a control that size in the middle of the screen.",
              },
              {
                label: "Bottom: the text input",
                body: "Where every messaging app puts it, and where the thumb already goes. Keeping it visible means **typing is never a hidden fallback**, but it sits below the microphone in the visual order because voice is the priority.",
              },
              {
                label: "Left rail: new chat and history",
                body: "First in the scanning order, carrying the two things a returning user needs. It also does the **recovery** work: on 2G a dropped session is routine, and a grievance in progress has to still be there when the page comes back.",
              },
              {
                label: "Top right: profile and account",
                body: "The conventional corner, deliberately **out of the task path**. Identity is something the system needs, not the person describing a problem, so it never interrupts the flow.",
              },
            ],
          },
          {
            kind: "statement",
            text: "One screen, **one obvious action**. Everything else is chrome that has to earn its place.",
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
              "A chat window is still an interface, and to somebody who has never used one it is still an exam. So the product has a face. **Didi means elder sister**, the person you already ask for help with a form. She is a government worker in a saree with a departmental lanyard, **lip-synced** to the spoken reply.",
            ],
          },
          {
            kind: "gallery",
            compact: true,
            items: [
              { src: "/projects/cpgrams/mascot-v1.webp", label: "Direction 1", alt: "An early mascot exploration for CPGRAMS." },
              { src: "/projects/cpgrams/mascot-v2.webp", label: "Direction 2", alt: "A second early mascot exploration for CPGRAMS." },
              { src: "/projects/cpgrams/mascot-v3.webp", label: "Direction 3", alt: "A third early mascot exploration for CPGRAMS." },
              { src: "/projects/cpgrams/mascot-v4.webp", label: "Direction 4", alt: "A fourth early mascot exploration for CPGRAMS." },
            ],
            caption:
              "Four directions before she settled. The test each had to pass: does a first-time filer read her as **staff who works here**, or as a brand character?",
          },
          {
            kind: "gallery",
            compact: true,
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
              "The shipped set, built as **states rather than one illustration**. A guide holding a single expression through a complaint about a missing pension reads as indifferent.",
          },
        ],
      },
      {
        name: "onboarding",
        heading: "First run: teaching the interface",
        blocks: [
          {
            kind: "prose",
            body: [
              "Seen once, the **first time a citizen opens the chatbot**. Everything after it assumes you know you can press a button and speak, and no government website has ever suggested that.",
            ],
          },
          {
            kind: "grid",
            items: [
              { src: "/projects/cpgrams/demo-01.webp", label: "01 Arrive", alt: "The CPGRAMS chatbot opening screen with a welcome message and the option to speak or type." },
              { src: "/projects/cpgrams/demo-02.webp", label: "02 Meet the guide", alt: "Samadhan Didi introduced at full height beside the CPGRAMS chatbot interface." },
              { src: "/projects/cpgrams/demo-03.webp", label: "03 Spotlight", alt: "The CPGRAMS chatbot with the interface dimmed and a single control spotlit during the tutorial." },
              { src: "/projects/cpgrams/demo-04.webp", label: "04 The microphone", alt: "The tutorial spotlighting the microphone with Samadhan Didi explaining to press it and speak in a preferred language." },
              { src: "/projects/cpgrams/demo-05.webp", label: "05 Hand over", alt: "The final tutorial screen of the CPGRAMS chatbot with a skip tutorial control visible." },
            ],
          },
          {
            kind: "prose",
            body: [
              "The tutorial **points at the interface** rather than describing it. **Spotlight masking** dims everything but the control being explained, and the microphone gets the plainest sentence in the product: press it and speak in your language.",
              "**Skip sits on the first frame**, not the last. Onboarding should not tax the confident user to reassure the uncertain one.",
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
          },
          {
            kind: "prose",
            body: [
              "On the phone she drops to a **corner presence**. At **402px** a full figure covers the control she is pointing at, turning the guide into the obstacle.",
            ],
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
              "For a quarter of the country, **reading and writing is the barrier**. Voice is the **accessibility strategy** here, not a convenience. Typing is the alternative.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/voice-01.webp", label: "01 Rest", alt: "The CPGRAMS voice flow resting state with a large central microphone control." },
              { src: "/projects/cpgrams/voice-02.webp", label: "02 Press to speak", alt: "The CPGRAMS voice flow with a press to speak prompt on the microphone." },
            ],
            body: [
              "**Entry.** The microphone holds the centre and the weight: no language picker, no category dropdown, since both demand a decision before you have said anything. The interface opens in English and waits, rather than asking who you are first. A single **press starts recording**, because hold-to-record fails for **tremor and arthritis** in the 60-plus group that files the most grievances here.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/voice-03.webp", label: "03 Listening", alt: "The CPGRAMS voice flow recording with a live waveform responding to speech." },
              { src: "/projects/cpgrams/voice-04.webp", label: "04 Audio kept", alt: "A user voice message in the CPGRAMS chat thread with a waveform audio player." },
            ],
            body: [
              "**Capture.** A **live waveform** proves the system is listening, and it is placed where the person is already looking, on the control they just pressed. Without that feedback an unsure speaker stops mid-sentence to check. The audio then **stays in the thread** rather than being discarded, since it is the one artefact here the software cannot have got wrong.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/voice-05.webp", label: "05 Transcribed", alt: "The CPGRAMS voice flow showing the transcribed text alongside the recorded audio." },
              { src: "/projects/cpgrams/voice-06.webp", label: "06 Language detected", alt: "The CPGRAMS voice flow with a detected regional language reflected in the interface." },
            ],
            body: [
              "**Transcription, then language.** Speech appears as text **in real time**, beside the audio it came from, which makes this the **first point of error recovery**: catching a misheard place name here costs nothing next to catching it after routing. Corrections go back through either input, voice or keyboard, so fixing a mistake never demands the skill the person came without. Language is **detected from what was said, not selected from a list**, and the whole interface switches to it. Speak Tamil and the product becomes Tamil. A picker would have been a reading test handed to people who may not read.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/voice-07.webp", label: "07 Answered aloud", alt: "Samadhan Didi responding with both written text and a voice response player." },
              { src: "/projects/cpgrams/voice-08.webp", label: "08 One question", alt: "The CPGRAMS chatbot asking a single follow-up question to complete a grievance." },
            ],
            body: [
              "**Understanding.** Every reply is **playable as well as readable**, since voice in with text out abandons the user at the half carrying the answer. Behind the reply the system is working out the nature of the problem, the department that owns it and the category it files under. What it still cannot infer arrives as **one question at a time**, in the conversation rather than in a second form, so working memory stays free for the answer instead of the interface.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/voice-09.webp", label: "09 Auto-filled", alt: "The CPGRAMS chatbot with an auto-filled grievance derived from the spoken complaint." },
              { src: "/projects/cpgrams/voice-10.webp", label: "10 Review", alt: "The CPGRAMS pre-submission review card showing the interpreted grievance and a submit control." },
            ],
            body: [
              "**Summary.** **Ministry, category, jurisdiction and urgency** come out of what was said, and documents are asked for only when the grievance actually needs one, at the moment it is needed. Everything then returns as a **short summary** the citizen checks before anything is sent: the interpretation, in their own language, in one card. **Auto-filing a legal document unseen** is a liability with the citizen's name on it, so this is the **consent surface** and the flow's real destination.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/voice-11.webp", label: "11 Escalate", alt: "The CPGRAMS review card with a link to register with the Central Authority." },
              { src: "/projects/cpgrams/voice-12.webp", label: "12 Filed", alt: "The CPGRAMS chatbot confirming a submitted grievance with a registration identifier." },
            ],
            body: [
              "**Submission.** Confirming sends the structured grievance straight to the department that owns it, with no portal navigation in between. When routing is wrong, **escalation to the Central Authority is one tap**: the system is allowed to be wrong, not allowed to be wrong **with no exit**. It closes on the **same registration number** the portal issues, which is also how the citizen tracks it afterwards, carrying the same 30 to 60 day clock.",
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
              { src: "/projects/cpgrams/m-voice-10.webp", label: "Filed", alt: "CPGRAMS phone confirmation screen with a registration identifier." },
            ],
          },
          {
            kind: "prose",
            body: [
              "The phone runs the same sequence, re-laid rather than reduced. This is the device the low-literacy user actually owns, often on **2G**, so the **left rail collapses into a sheet** and gives its space back to the conversation, the microphone drops into the **thumb arc** instead of the optical centre, and the summary takes the **full screen** so nothing it is asking consent for sits below the fold.",
            ],
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
              "Voice is the **priority, not the requirement**. Plenty of citizens would rather type, and speaking a complaint aloud is not always possible in a shared house or a queue.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/text-01.webp", label: "01 Open", alt: "The CPGRAMS text flow opening screen with the message input ready." },
              { src: "/projects/cpgrams/text-02.webp", label: "02 Describe", alt: "A typed grievance in the CPGRAMS chat written in plain conversational language." },
            ],
            body: [
              "It opens with the **input focused and nothing else required**. The portal's first question was which of ninety ministries owns your problem. This one's is what happened, and everything the form demanded up front is **extracted from that answer**.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/text-03.webp", label: "03 Acknowledged", alt: "The CPGRAMS chatbot restating the citizen's grievance back to them." },
              { src: "/projects/cpgrams/text-04.webp", label: "04 One question", alt: "The CPGRAMS chatbot asking a single follow-up question in the typed flow." },
            ],
            body: [
              "The reply **restates the problem before acting on it**, the cheapest **error recovery** there is and a signal of comprehension rather than keyword matching. Missing details arrive as **sequential questions**. The fifteen fields still get filled, they just never appear as a form.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/text-05.webp", label: "05 Options", alt: "The CPGRAMS chatbot offering selectable options for a closed-set question." },
              { src: "/projects/cpgrams/text-06.webp", label: "06 Documents", alt: "The CPGRAMS chatbot requesting a supporting document within the conversation." },
            ],
            body: [
              "A **closed set gets options**, not an open field. Typing an answer the system already holds the list of is a spelling test with a routing failure attached. Documents are requested **in the conversation, at the point they are needed**, and only when the grievance genuinely needs one. A checklist of paperwork on screen one is a reason to leave.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/text-07.webp", label: "07 History", alt: "The CPGRAMS chat with recent conversations listed in the left sidebar." },
              { src: "/projects/cpgrams/text-08.webp", label: "08 Classified", alt: "The CPGRAMS chatbot resolving the ministry and category for a typed grievance." },
            ],
            body: [
              "Conversations **persist in the left rail**, because on 2G a **session timeout** is routine and a half-written grievance lost is usually that grievance lost for good. **Classification happens quietly** in the background: the highest-friction field on the original form, resolved without being asked.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/text-09.webp", label: "09 Jurisdiction", alt: "The CPGRAMS chatbot showing the detected state and jurisdiction for a grievance." },
              { src: "/projects/cpgrams/text-10.webp", label: "10 Assembled", alt: "The CPGRAMS chatbot presenting the assembled grievance with all collected details." },
            ],
            body: [
              "**Jurisdiction** resolves the same way, from what was described rather than a dropdown of states. Then everything scattered across the conversation returns as the **single document that will be filed**.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/text-11.webp", label: "11 Review", alt: "The CPGRAMS review card in the typed flow showing the interpreted grievance." },
              { src: "/projects/cpgrams/text-12.webp", label: "12 Submit", alt: "The CPGRAMS review card with submit, new chat and a central authority escalation link." },
            ],
            body: [
              "The typed flow ends at the **same consent surface**. One architecture, two inputs: the review screen is not a voice feature, it is where **software stops acting on somebody's behalf without showing what it decided**. Submit, start again, or **escalate**. Three exits, none of them the fifteen fields again.",
            ],
          },
          {
            kind: "step",
            items: [
              { src: "/projects/cpgrams/text-13.webp", label: "13 Filed", alt: "The CPGRAMS confirmation screen with a grievance registration identifier." },
            ],
            body: [
              "The same **registration number**, the same **30 to 60 day** obligation, the same escalation path. Only the qualification required to reach it changed.",
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
          },
          {
            kind: "prose",
            body: [
              "Typed or spoken, the phone layout is the same: rail in a sheet, input at the thumb, summary **full screen**. That last one is the only moment in the product where something below the fold would be a real failure rather than an inconvenience.",
            ],
          },
        ],
      },
      {
        name: "decisions",
        heading: "The decisions",
        blocks: [
          {
            kind: "decisions",
            items: [
              {
                tag: "Classification",
                label: "Never ask for the ministry",
                body: "The **highest-friction field** on the portal and the one a citizen is least equipped to answer. Inferred from what they said, confirmed at review, **never asked**.",
              },
              {
                tag: "Language",
                label: "Detect the language, do not offer a list",
                body: "A language picker is a **reading test** given to people who may not read. Detection removes the test and the interface adapts to what it heard.",
              },
              {
                tag: "Parity",
                label: "Speak every answer, not just accept speech",
                body: "**Voice in with text out** solves half the literacy problem, then abandons the user at the half containing the answer.",
              },
              {
                tag: "Motor access",
                label: "Press, do not press and hold",
                body: "Hold-to-record fails for **tremor and arthritis**, and the **60-plus group** files more grievances than anyone else on the platform.",
              },
              {
                tag: "Consent",
                label: "Show the interpretation before submitting",
                body: "**Auto-filing a legal document** for somebody needs their consent to what it says. The review screen is where the system **admits what it assumed**.",
              },
              {
                tag: "Recovery",
                label: "Give a wrong answer somewhere to go",
                body: "When state-level routing is wrong, **escalation to the Central Authority is one tap** rather than starting again.",
              },
              {
                tag: "Trust",
                label: "Keep the state's own visual authority",
                body: "The saffron, the emblem, the departmental masthead, the ministers. A grievance tool that **looks unofficial** does not get trusted with a grievance.",
              },
            ],
          },
        ],
      },
      {
        name: "design system",
        heading: "The system underneath",
        blocks: [
          {
            kind: "prose",
            body: [
              "Built for a **conversation rather than a page**: bubbles by speaker, audio players, state and language tags, the review card, spotlights, mascot states. **Saffron is the state's own colour**, and a grievance tool that invented its own would look like it belonged to nobody.",
            ],
          },
          {
            kind: "palette",
            items: [
              { name: "Saffron", hex: "#FE6700", use: "Primary action and government identity" },
              { name: "Deep", hex: "#9F2D00", use: "Pressed states and emphasis" },
              { name: "Warm", hex: "#FFC196", use: "Surfaces and the citizen's own bubbles" },
              { name: "Cream", hex: "#FFFBEF", use: "The chat canvas itself" },
              { name: "Ink", hex: "#333333", use: "Body copy" },
              { name: "Slate", hex: "#4A505B", use: "Secondary text and labels" },
            ],
            caption:
              "Only one of the six is loud. **Saffron carries every primary action**, which is what lets a user who cannot read the label still find the button.",
          },
          {
            kind: "typeset",
            items: [
              {
                name: "Interface",
                family: "Inter",
                sample: "Press and speak in your language",
                stack: "var(--font-inter), Inter, sans-serif",
                use: "Chat, controls and labels, the running voice of the product",
              },
              {
                name: "Supporting",
                family: "General Sans",
                sample: "File a grievance",
                use: "Headings and the few moments that need weight",
              },
              {
                name: "Script",
                family: "Roboto",
                sample: "शिकायत दर्ज करें",
                stack: "Roboto, 'Noto Sans Devanagari', sans-serif",
                use: "Devanagari and regional script coverage",
              },
            ],
            caption:
              "Roboto is in the stack for one reason: **Devanagari and most regional scripts**. A product claiming **22 languages** cannot ship a typeface that renders two.",
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/cpgrams/components-1.webp",
                small: true,
                label: "Message and input components",
                alt: "A Figma component set for the CPGRAMS chatbot showing message bubble and input variants.",
              },
              {
                src: "/projects/cpgrams/components-2.webp",
                small: true,
                label: "State variants",
                alt: "A Figma component set showing state variants for the CPGRAMS chatbot controls.",
              },
            ],
            caption:
              "The component set behind all of it, built as **variants rather than screens**. A conversation has no fixed layout to hand a developer, only states and the rules for moving between them.",
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
              "It is **live at cpgramsaichatbot.com**, running against the real grievance system rather than standing as a concept.",
            ],
          },
          {
            kind: "compare",
            lanes: [
              {
                label: "What filing used to require",
                tone: "before",
                note: "A qualification test, sat before you were allowed to complain.",
                steps: [
                  "Reading English or Hindi",
                  "Knowing which of 90+ ministries owns your problem",
                  "Knowing the right category inside it",
                  "A desktop, or a phone used like one",
                  "Finishing before the session expired",
                ],
              },
              {
                label: "What it requires now",
                tone: "after",
                note: "Everything else moved into the software that already knew it.",
                steps: ["Being able to speak", "Checking the system got it right"],
              },
            ],
            caption:
              "The service did not change. The **qualification required to reach it** did, and that is the outcome.",
          },
          {
            kind: "prose",
            body: [
              "For **DARPG**, grievances now arrive **pre-categorised and correctly routed**, work that used to land on an officer before the statutory clock started.",
            ],
          },
          {
            kind: "results",
            items: [
              {
                value: "3x",
                label: "more grievances filed",
                note: "The scope was sized against reaching the people the portal never heard from.",
                projected: true,
              },
              {
                value: "40%",
                label: "fewer incomplete submissions",
                note: "Against a baseline where six in ten abandon the form partway through.",
                projected: true,
              },
              {
                value: "85%",
                label: "citizen satisfaction",
                note: "The target the conversational layer was commissioned against.",
                projected: true,
              },
            ],
            caption:
              "These are the **targets the work was scoped against, not results it achieved**. Post-launch numbers sit with the department.",
          },
        ],
      },
      {
        name: "reflection",
        heading: "What I learned",
        blocks: [
          {
            kind: "lessons",
            items: [
              {
                title: "I started out treating voice as a feature. It was the whole product.",
                body: "For a while I designed it as one of two input options. Then I tried removing it on paper, and what was left was the form again, just friendlier. If a quarter of your users cannot read or write, everything else you do is decoration. Once I accepted that, the rest of the decisions got easier: **detect the language instead of asking for it, speak every reply, never put a dropdown in the way**.",
              },
              {
                title: "Letting the AI do everything quietly would have been the wrong kind of easy.",
                body: "My first instinct was to hide the whole process, since the form was the problem. But this is a **legal complaint with somebody's name on it**. If the system picked the wrong department and nobody saw it, that is worse than the form ever was. So the summary screen exists, and it is the plainest thing in the design. It is also the part I would defend first.",
              },
              {
                title: "Small design mistakes stop being small at this scale.",
                body: "A confusing dropdown is a minor usability issue in most products. Here it is **millions of people who never get heard by their own government**. It made me slower and more careful about the kind of detail I would normally ship and fix later.",
              },
              {
                title: "Familiar worked better than clever.",
                body: "I wanted to design something cleaner than a government portal. What actually worked was **keeping the shape people already recognised**, the left rail, the account corner, the input at the bottom, and spending the effort on the one thing that had to change. Novelty here would have cost trust I had no way to earn back.",
              },
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
    /*
      The product's own gold. 7.32:1 on the dark canvas but only 2.28:1 on
      white, so light-mode TEXT drops to a deeper gold of the same hue while
      `solid` keeps the true brand value for borders and rings.

      `bright` runs the cursor, its tag, the pins and the highlight, which
      are meant to be spotted rather than read through. White on gold is
      2.3:1, so `ink` puts near-black on it instead. `fill` is the deepest
      value in the set, the only one white reliably reads on.
    */
    accent: {
      dark: "#C9A769",
      light: "#8A6A28",
      solid: "#C9A769",
      bright: "#D9B77A",
      ink: "#1B1405",
      /* cards and flow steps fill with the brand gold itself, and gold needs
         near-black on it: white measures 2.28:1, the dark ink 8.02:1 */
      fill: "#C9A769",
      fillInk: "#1B1405",
      /* headings hover to the bronze rather than the gold, which sits too
         close to the body text to register as a state change */
      hover: "#7C6A46",
    },
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
        name: "overview",
        heading: "Two hours nobody has a use for",
        blocks: [
          {
            kind: "brief",
            items: [
              {
                label: "What it is",
                wide: true,
                body: "The layer that turns a layover into usable time. **FoodSync** puts every outlet in your terminal into one live menu; **LoungeSync** checks whether your card gets you in, books the seat, and opens the gate with a QR code. I joined at zero and took it to **four shipping-ready surfaces**.",
              },
              {
                label: "The problem",
                body: "You are in a building full of food and lounges with **no way to know what is open, how far it is, or whether you have time**.",
              },
              {
                label: "Key challenges",
                body: "**Four user types, one brand.** No live airport data to design against, and the work had to win the partnerships it depended on.",
              },
              {
                label: "Key decisions",
                body: "**Prep time gets equal billing with price.** Login moves to the checkout. Dark for travellers, light for operators.",
              },
              {
                label: "Outcome",
                body: "**The company raised on this work**, with airport pilot conversations underway. The designs doubled as the product spec.",
              },
              {
                label: "What I learned",
                body: "I was asked for a food app. What the traveller needed was an answer to **will I make my flight** — identical on a wireframe, nothing alike in a terminal.",
              },
            ],
          },
          {
            kind: "stats",
            items: [
              { value: "4", label: "product surfaces designed end to end" },
              { value: "6", label: "full iteration passes on the marketing site" },
              { value: "13", label: "versions of the sign-up screen alone" },
            ],
          },
        ],
      },
      {
        name: "problem",
        heading: "The problem",
        blocks: [
          {
            kind: "prose",
            body: [
              "Two people want the same thing from opposite directions and never meet. The traveller wants to know **how long**. The outlet wants to know **how many**. Nobody had built the layer between them.",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "Lounge access was a guess",
                body: "Membership rules nobody could parse and **no real-time seat availability**. You found out at the counter, in front of a queue.",
              },
              {
                label: "Terminal food was invisible",
                body: "Outlets had **no digital presence**. No listing, no live menu, no way to compare, no way to order ahead.",
              },
              {
                label: "Demand was already there",
                body: "The willingness to pay for comfort exists. **Manual, counter-and-paper systems** on both sides were the only thing in the way.",
              },
            ],
          },
          {
            kind: "bars",
            items: [
              { label: "Global airport lounge market, growing 15% a year", value: 100, display: "$5.71B", tone: "good" },
              { label: "Airports worldwide, almost none connected end to end", value: 62, display: "10,000+", tone: "bad" },
              { label: "Play Store rating of the incumbent that owns the partnerships", value: 40, display: "2 stars", tone: "bad" },
            ],
            caption:
              "The last number is the opening. **The category is not short on supply** — the dominant player already holds the bank, airline and lounge deals. What it does not have is a product anyone wants to open twice.",
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
              "The moment this stopped being a food-ordering app and became a **time-certainty app**, every screen resolved. A prep-time badge stopped being a detail and became the most important element on a card. **Get Directions earned equal weight with Order Now**, because food you cannot find in time is worth nothing. The QR code stopped being a payment feature and became a queue-removal feature.",
              "Same components. Different product.",
            ],
          },
        ],
      },
      {
        name: "structure",
        heading: "Mapping it before drawing it",
        blocks: [
          {
            kind: "prose",
            body: [
              "I mapped the whole journey before a single screen. The first structure came out **eleven clicks deep** — in a terminal, holding a bag, watching a departure board.",
            ],
          },
          {
            kind: "flow",
            steps: [
              { label: "Land", sub: ["Airport or PNR", "No account asked for"] },
              { label: "Terminal", sub: ["Sets everything after it"] },
              { label: "Outlets", sub: ["Veg or non-veg", "Pier and prep time"] },
              { label: "Menu", sub: ["Live availability"] },
              { label: "Cart", sub: ["Edit before committing"] },
              { label: "Account", decision: true, sub: ["Requested here, not earlier"] },
              { label: "Pay", sub: ["Single confirm"] },
              { label: "Track", sub: ["Ready in 20 minutes", "Directions to the pier"] },
            ],
            caption:
              "**Login moved from the front door to the checkout.** Nobody in an airport wants an account, they want a sandwich. Everything before Cart is browsable by a stranger, and the one hard gate sits where money is involved.",
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
                "The rotated **e**: a plane turning back on itself, which is a layover in one letter.",
              alt: "The LayOver wordmark in white on a black billboard on a tree-lined street, the e rotated 180 degrees.",
            },
          },
          {
            kind: "prose",
            body: [
              "Terminals are grey, fluorescent and loud, so the brand goes the other way: **warm bronze and gold on near-black**, closer to a business-class cabin at night than a food court. The promise is not speed, it is comfort you did not expect to get.",
            ],
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
              "Six passes to get here. The final direction stops explaining LayOver and starts being it: **the airport selector lives inside the hero**, so the first thing the site does is the first thing the product does.",
            ],
          },
          {
            kind: "grid",
            items: [
              { src: "/projects/layover/web-landing.webp", label: "01 Landing", alt: "The full LayOver landing page with an airport and PNR entry field in the hero." },
              { src: "/projects/layover/web-eateries.webp", label: "02 Outlet directory", alt: "LayOver's web outlet directory showing terminal restaurants with Order now and Get Directions actions." },
              { src: "/projects/layover/web-menu.webp", label: "03 Menu", alt: "A restaurant menu page on LayOver's website with dish cards and prices." },
              { src: "/projects/layover/web-about.webp", label: "04 About", alt: "LayOver's About section describing the product." },
              { src: "/projects/layover/web-contact.webp", label: "05 Get in touch", alt: "LayOver's contact and footer section with a message form." },
              { src: "/projects/layover/order.webp", label: "06 Order tracking", alt: "LayOver's order-confirmed screen with a twenty-minute prep timer and a map." },
            ],
          },
          {
            kind: "prose",
            body: [
              "Every card answers four questions before you tap it: **who, how far, how good, how long**. The pier replaces the street address, because in a terminal *where* is the only question that matters. Veg and non-veg sits in the filter bar rather than a drawer — in India that is a **first-class identity decision**, not a refinement.",
              "Tracking replaces status language with a countdown and keeps the outlet's location on screen throughout. If something goes wrong you are ten metres from the person who can fix it.",
            ],
          },
          {
            kind: "gallery",
            compact: true,
            items: [
              { src: "/projects/layover/web-mobile-home.webp", label: "Home", alt: "LayOver's website on a phone showing the dark home layout with outlet cards." },
              { src: "/projects/layover/web-mobile-order.webp", label: "Order", alt: "LayOver's website order flow on a phone with the itemised order and prep timer." },
            ],
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
              "The app opens on the only question that matters: **which airport, which terminal**. Until it knows that, no listing on screen means anything, so location is the first screen rather than a setting in a profile.",
            ],
          },
          {
            kind: "gallery",
            items: [
              { src: "/projects/layover/app-signup.webp", label: "01 Sign up", alt: "The LayOver app sign-up screen with phone number entry." },
              { src: "/projects/layover/app-onboarding.webp", label: "02 Onboarding", alt: "LayOver app onboarding screen with an illustration and the line all your airport needs in one app." },
              { src: "/projects/layover/app-location.webp", label: "03 Airport", alt: "The LayOver app airport selection screen listing Indian airports." },
              { src: "/projects/layover/app-location-type.webp", label: "04 Terminal", alt: "The LayOver app terminal and travel type selection screen." },
              { src: "/projects/layover/app-home.webp", label: "05 Outlets", alt: "The LayOver app home screen showing Departures Terminal 3 with outlet cards and prep times." },
              { src: "/projects/layover/app-menu.webp", label: "06 Menu", alt: "A restaurant menu screen in the LayOver app with dish images and prices." },
              { src: "/projects/layover/app-menu-option.webp", label: "07 Options", alt: "The LayOver app item customisation screen with size and add-on options." },
              { src: "/projects/layover/app-added.webp", label: "08 Added", alt: "The LayOver app menu screen with an item added and the cart count updated." },
              { src: "/projects/layover/app-cart.webp", label: "09 Cart", alt: "The LayOver app cart screen listing ordered items with quantities and totals." },
              { src: "/projects/layover/app-cart-pay.webp", label: "10 Payment", alt: "The LayOver app cart with the to-pay dropdown showing totals, taxes and fees." },
            ],
          },
          {
            kind: "prose",
            body: [
              "**Sign-up took thirteen versions.** Everything after it is a consequence of one decision: ask where you are before you ask anything else. The Food and Café split follows the same logic — you already know which one you want before you open the app.",
              "Prep time appears on the outlet card, on the item, and again in the cart, because the thing a traveller is actually deciding is **whether they have time**.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/app.webp",
              narrow: true,
              caption: "The same flow in the launch presentation.",
              alt: "Two phone screens showing LayOver's food ordering interface in cream and gold.",
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
              "Here the visual system flips. An order queue is read **standing up, under fluorescent light, at arm's length**, by someone whose hands are full. So it is light, flat and high contrast, with nothing decorative competing with a number.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/flow-vendor.webp",
              wide: true,
              caption:
                "The whole vendor surface on one canvas: login, six-step onboarding, dashboard, orders, menu and its edit states, coupons, revenue, reviews, and the bank-verification settings flow.",
              alt: "A Figma board showing every screen of the LayOver vendor portal arranged in rows.",
            },
          },
          {
            kind: "grid",
            items: [
              { src: "/projects/layover/vendor-dashboard.webp", label: "01 Order wall", alt: "LayOver's vendor dashboard with an incoming order card and a grid of order cards marked Ready or Delivered." },
              { src: "/projects/layover/vendor-onboarding.webp", label: "02 Onboarding", alt: "The six-step LayOver vendor onboarding flow laid out left to right." },
              { src: "/projects/layover/vendor-menu.webp", label: "03 Menu", alt: "LayOver's vendor menu management screen with food item cards and edit controls." },
              { src: "/projects/layover/vendor-addedit-section.webp", label: "04 Add section", alt: "The add or edit section dialog in LayOver's vendor menu manager." },
              { src: "/projects/layover/vendor-addedit-item.webp", label: "05 Add item", alt: "The add or edit item screen in LayOver's vendor portal with a dish photo and price." },
              { src: "/projects/layover/vendor-empty.webp", label: "06 Empty state", alt: "The empty menu state in LayOver's vendor portal with an Add Your First Section button." },
              { src: "/projects/layover/vendor-orders.webp", label: "07 Orders", alt: "LayOver's vendor orders screen listing past and current orders." },
              { src: "/projects/layover/vendor-coupons.webp", label: "08 Coupons", alt: "LayOver's vendor coupons screen showing discount codes and QR codes." },
              { src: "/projects/layover/vendor-analytics.webp", label: "09 Revenue", alt: "LayOver's vendor analytics screen with revenue charts and top selling items." },
              { src: "/projects/layover/vendor-reviews.webp", label: "10 Reviews", alt: "LayOver's vendor reviews screen with customer reviews and reply controls." },
              { src: "/projects/layover/vendor-settings.webp", label: "11 Settings", alt: "The LayOver vendor profile and settings flow including bank details and OTP verification." },
              { src: "/projects/layover/vendor-login.webp", label: "12 Login", alt: "LayOver's vendor login screen beside a reset password screen." },
            ],
          },
          {
            kind: "prose",
            body: [
              "Orders are a wall of cards colour-coded by state, each with a live timer. **Accept and Reject are the two largest targets on the screen**, and there is no navigation to learn — the whole job lives on one surface.",
              "Menus change daily and a stale menu in an airport means a refunded order, so sections and items are **edited in place** rather than through a separate builder. The empty state got the same attention as the dashboard: a new outlet's first login is their first impression of the platform, and it is a screen with nothing in it.",
            ],
          },
          {
            kind: "gallery",
            compact: true,
            items: [
              { src: "/projects/layover/vendor-mobile.webp", label: "Mobile portal", alt: "The LayOver vendor dashboard on a phone with a compact order list." },
            ],
          },
          {
            kind: "prose",
            body: [
              "On a busy day nobody is at the desk, so **the order wall had to survive in a pocket**.",
            ],
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
              "The layer nobody sees and everything depends on. Built for **scanning, not exploring**: every vendor row surfaces the same four metrics in the same four positions, so a hundred outlets read at the speed of one.",
            ],
          },
          {
            kind: "grid",
            items: [
              { src: "/projects/layover/admin-vendors.webp", label: "01 Vendors", alt: "LayOver's admin vendor management screen listing outlets with orders, revenue, rating and prep time." },
              { src: "/projects/layover/admin-onboarding.webp", label: "02 Approval", alt: "LayOver's admin vendor onboarding screen with application details and approval controls." },
              { src: "/projects/layover/admin-vendor-menu.webp", label: "03 Menu oversight", alt: "LayOver's admin view of a vendor's menu with item cards and availability." },
              { src: "/projects/layover/admin-menu.webp", label: "04 Menu tools", alt: "LayOver's admin menu management screen with sections and food item cards." },
              { src: "/projects/layover/admin-addedit-section.webp", label: "05 Add section", alt: "The admin add or edit menu section screen in LayOver's admin portal." },
              { src: "/projects/layover/admin-addedit-item.webp", label: "06 Add item", alt: "The admin add or edit item screen in LayOver's admin portal." },
              { src: "/projects/layover/admin-orders.webp", label: "07 Orders", alt: "LayOver's admin orders screen listing orders across all vendors." },
              { src: "/projects/layover/admin-users.webp", label: "08 Users", alt: "LayOver's admin user management screen with a table of users." },
            ],
          },
          {
            kind: "prose",
            body: [
              "Admin can see and correct a vendor's menu directly, because at launch **an outlet's first menu upload is rarely right**. The add and edit screens are deliberately identical to the vendor equivalents: two interfaces for the same job is how the two drift apart.",
            ],
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
                body: "On a restaurant app, price decides. **In a terminal, time decides.** Every card leads with minutes.",
              },
              {
                label: "Get Directions sits next to Order Now",
                body: "Ordering food you cannot find is worse than not ordering. **Two actions, equal weight**, always paired.",
              },
              {
                label: "Login moved to the checkout",
                body: "Browsing is free. The account is requested **only at the moment it becomes necessary**.",
              },
              {
                label: "Veg and non-veg is a header control",
                body: "Filters refine. This is a **first-class identity decision** for a large share of Indian travellers, so it lives where they see it first.",
              },
              {
                label: "Two visual systems, one brand",
                body: "**Dark and warm for travellers, light and dense for operators.** Same wordmark, opposite temperature, because they are used in opposite lighting.",
              },
              {
                label: "Empty states were designed, not deferred",
                body: "A new outlet's first login shows an empty menu. That screen is **their first impression of the whole platform**.",
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
              "Nothing arrived fully formed. The site went through **six labelled passes**: first structure, restructure, a wide exploration board, a near-final, a final, and the final that shipped.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/iterations.webp",
              wide: true,
              caption:
                "One pass, as it sits on the canvas. **Ten full page layouts explored in parallel** before anything was chosen, and this is the first of six such boards.",
              alt: "A Figma canvas board holding ten full-page dark website layouts for LayOver arranged in a grid.",
            },
          },
          {
            kind: "prose",
            body: [
              "Between the first and the last, the hero went from an empty carousel shell to an airport selector, and the listing went from **four unlabelled tiles to cards carrying four data points each**.",
            ],
          },
        ],
      },
      {
        name: "design system",
        heading: "The system underneath",
        blocks: [
          {
            kind: "prose",
            body: [
              "Built to survive **four surfaces and two lighting conditions** without either half looking borrowed from the other.",
            ],
          },
          {
            kind: "palette",
            items: [
              { name: "Gold", hex: "#C9A769", use: "Accents, active states, the brand's voice" },
              { name: "Bronze", hex: "#7C6A46", use: "Primary brand, borders and fills" },
              { name: "Gold Light", hex: "#FDCE77", use: "Emphasis on dark, badges" },
              { name: "Ink", hex: "#0D0D0D", use: "The consumer surface base" },
              { name: "Surface", hex: "#1E1E1E", use: "Elevated cards on dark" },
              { name: "Alert", hex: "#F65F5F", use: "Reject, non-veg, destructive" },
            ],
            caption:
              "**Gold is the only colour that speaks.** Everything else is a surface, which is what lets one accent carry every primary action across four products.",
          },
          {
            kind: "prose",
            body: [
              "**Montserrat** across marketing and consumer, **Sofia Pro** as the supporting voice, and **Inter** inside the operator portals, where density and legibility beat personality.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/system.webp",
              wide: true,
              caption: "Site and app as one system: the dark front door, the warm room behind it.",
              alt: "LayOver's marketing site and mobile app shown together.",
            },
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
              "**The company raised on this work**, and pilot conversations with Indian airports are underway. The designs did double duty as the product spec and the fundraising material.",
              "For travellers, the path went from an eleven-click structure to a flow where **location, terminal and wait time are answered before they are asked**. For outlets, demand became visible before it arrived, and the order queue became one glanceable wall instead of a counter and a shout.",
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
              "The hardest part of a 0-to-1 project is **resisting the urge to design the thing you were asked for**. I was asked for a food-ordering app. What the traveller needed was an answer to *will I make my flight*. Those look identical on a wireframe and behave nothing alike in a terminal.",
              "Designing for four users at once is not four times the work, it is a different kind of work. The value was never in the individual screens. It was in making sure **a decision made on the traveller's screen still made sense to the person in the kitchen** twenty metres away.",
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
    kind: "case-study",
    title: "Futurepreneurs",
    logoText: "FUTUREPRENEURS",
    logoUrl: "/projects/futurepreneurs-logo.webp",
    category: "Event Website",
    year: "2024",
    cover: "/projects/futurepreneurs-cover.webp",
    preview: {
      kind: "website",
      href: "https://future-preneurs-24.vercel.app/",
      image: "/projects/futurepreneurs-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Web Design",
    tools: ["Framer", "Figma"],
    description:
      "The site for Futurepreneurs 10.0, E-Cell VIT Vellore's flagship business simulation event. A tenth edition needed to look like one, so the design leans on a countdown, a timeline and one hard deadline rather than on fest-poster maximalism.",
    highlights: [
      "Countdown-led landing page built around one hard registration deadline",
      "Five-stage event timeline designed to read as a sequence, not a list",
      "Framer build so a student team could update content without a developer",
    ],
    extraFacts: [
      ["Edition", "10.0 - Xth edition"],
      ["Organiser", "E-Cell, VIT Vellore"],
    ],
    sections: [
      {
        name: "overview",
        heading: "The short version",
        blocks: [
          {
            kind: "brief",
            items: [
              {
                label: "What it is",
                wide: true,
                body: "The event site for **Futurepreneurs 10.0**, the flagship business simulation run by the **Entrepreneurship Cell at VIT Vellore**. Registration, timeline, the story of the format and a live countdown to the day itself - one page carrying all of it.",
              },
              {
                label: "The problem",
                body: "A campus event site is read once, fast, on a phone, usually while deciding whether to sign up. Everything on it competes with the **one thing that matters: the deadline.**",
              },
              {
                label: "Key decisions",
                body: "Lead with the **countdown**, not the copy. Give the timeline its own visual system so five dates read as a sequence. **One accent colour**, used sparingly.",
              },
              {
                label: "Outcome",
                body: "A tenth-edition site that reads startup-grade rather than student-fest, built in Framer so the team could update content through a multi-week campaign without a developer.",
              },
            ],
          },
        ],
      },
      {
        name: "hero",
        heading: "The deadline is the headline",
        blocks: [
          {
            kind: "prose",
            body: [
              "The masthead sets **FUTURE PRENEURS** against a single outsized **X** - the tenth edition as a graphic device rather than a line of copy. Below it, the only number anyone acts on: time left to register, counted in days, hours and minutes.",
              "Everything else on the first screen is subordinate to those two elements. The gradient field behind them is the one place the design allows itself colour.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/hero.webp",
              wide: true,
              caption:
                "The landing view - masthead, register, and the countdown everything else defers to.",
              alt: "Futurepreneurs Xth edition landing page on a laptop, with a live registration countdown reading 03:24:35.",
            },
          },
        ],
      },
      {
        name: "about",
        heading: "What the event actually is",
        blocks: [
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/about.webp",
              wide: true,
              caption:
                "Futurepreneurs 10.0 - the flagship event of the Entrepreneurship Cell, VIT Vellore.",
              alt: "Dark section describing Futurepreneurs 10.0 as an initiative immersing participants in the realities of the professional world.",
            },
          },
        ],
      },
      {
        name: "system",
        heading: "The system it is built on",
        blocks: [
          {
            kind: "prose",
            body: [
              "Two families doing different jobs. **Whyte Inktrap** carries the display weight - its cut-in traps keep the masthead sharp at poster scale. **Gantari** and **Almarai** handle everything a person has to actually read.",
              "The palette is two colours and two neutrals. **Slateblue** anchors the brand, **Sorrell Brown** is the single warm accent, and black and white do the structural work.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/typography.webp",
              wide: true,
              caption:
                "Whyte Inktrap for display, Gantari and Almarai for everything that has to be read.",
              alt: "Typography specimen board showing Whyte Inktrap, Almarai Regular and Gantari Medium.",
            },
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/theme.webp",
              wide: true,
              caption: "Slateblue, Sorrell Brown, and the two neutrals holding the structure.",
              alt: "Colour palette: 653BD8 Slateblue, F59869 Sorrell Brown, FFFFFF White, 000000 Outer Space.",
            },
          },
        ],
      },
      {
        name: "process",
        heading: "How it got made",
        blocks: [
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/process.webp",
              wide: true,
              caption:
                "Research, ideate, wireframe, UI concept, design - staggered rather than sequential.",
              alt: "Process diagram showing overlapping stages: Research, Ideate, Wireframe, UI Concept and Design.",
            },
          },
        ],
      },
      {
        name: "elements",
        heading: "The pieces up close",
        blocks: [
          {
            kind: "prose",
            body: [
              "The timeline is the component the whole page turns on. Five dates - registration opening, closing, two qualifier stages and the D Day - built as numbered cards on a connecting line, so the sequence reads at a glance rather than being parsed as a list.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/elements.webp",
              wide: true,
              caption: "The timeline component, and the same page held to a phone.",
              alt: "Close-up of the numbered event timeline cards on desktop, beside the mobile view of the landing page.",
            },
          },
        ],
      },
      {
        name: "the-site",
        heading: "The finished site, top to bottom",
        blocks: [
          {
            kind: "prose",
            body: [
              "Desktop and mobile side by side, full scroll. The same five sections in both - masthead and countdown, the pitch for the simulation, the timeline, ten years of history, then FAQs and the E-Cell footer.",
              "The mobile view is not the desktop one narrowed. The timeline reflows from a five-across row into stacked pairs, and the three-column explainer becomes a single column of cards - the two places where the desktop layout would have collapsed into something unreadable if it had simply been squeezed.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/fullview.webp",
              wide: true,
              caption: "The full page in both views - webview left, mobview right.",
              alt: "Full-length screenshots of the Futurepreneurs site: the desktop page beside the mobile page, both showing masthead, timeline, ten-years section, FAQs and footer.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "posterfolio",
    /* deliberately NOT kind: "case-study" — a wall of posters is a body of
       work, not an argument about one, and the works page splits the two on
       this flag. The poster grid still renders: FigmaProjectPage keys that
       off `sections`, not off the kind. */
    title: "Posterfolio",
    logoText: "POSTERFOLIO",
    category: "Poster Design",
    year: "2025",
    cover: "/projects/posterfolio-cover.webp",
    preview: {
      kind: "website",
      href: "https://www.behance.net/AAYUSHVISUALS",
      image: "/projects/posterfolio-cover.webp",
    },
    cta: "View on Behance",
    role: "Graphic Design",
    tools: ["Photoshop", "Illustrator", "Figma"],
    description:
      "A running series of posters — startup teardowns, product launches, editorial covers, merch and title cards. One format, held across dozens of subjects, as a way of practising composition and type under a fixed constraint.",
    highlights: [
      "41 posters across startup, editorial, product and merch briefs",
      "One 4:5 format throughout, so the variation is in composition rather than canvas",
      "Type-led layouts built to read at thumbnail size before they read at full size",
    ],
    extraFacts: [
      ["Posters", "41"],
      ["Format", "4:5, poster"],
    ],
    sections: [
      {
        name: "overview",
        heading: "The short version",
        blocks: [
          {
            kind: "brief",
            items: [
              {
                label: "What it is",
                wide: true,
                body: "An ongoing set of **41 posters** covering startup teardowns, product launches, editorial covers, streetwear merch and title cards. Not a campaign — **a practice**, run at one format over a long stretch.",
              },
              {
                label: "The constraint",
                body: "**One canvas, 4:5.** Every poster gets the same rectangle, so nothing can be solved by changing the shape of the page.",
              },
              {
                label: "What it is for",
                body: "Most of these are read at **thumbnail scale first** — a feed, a grid, a contact sheet. The layout has to survive being small before it earns being large.",
              },
            ],
          },
        ],
      },
      {
        /*
          One wall, not fourteen sets.

          The posters were split into labelled groups of three, which gave
          the page a heading and a rule every three images — the series read
          as fourteen small announcements rather than as one body of work.
          A contact sheet is the honest format for this: the whole set in a
          single grid, nothing between the frames, so the variation across
          them is the thing you see.
        */
        name: "posters",
        heading: "",
        blocks: [
          {
            kind: "grid",
            items: [
              { src: "/projects/posterfolio/poster-01.webp", alt: "Poster 1 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-02.webp", alt: "Poster 2 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-03.webp", alt: "Poster 3 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-04.webp", alt: "Poster 4 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-05.webp", alt: "Poster 5 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-06.webp", alt: "Poster 6 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-07.webp", alt: "Poster 7 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-08.webp", alt: "Poster 8 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-09.webp", alt: "Poster 9 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-10.webp", alt: "Poster 10 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-11.webp", alt: "Poster 11 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-12.webp", alt: "Poster 12 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-13.webp", alt: "Poster 13 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-14.webp", alt: "Poster 14 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-15.webp", alt: "Poster 15 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-16.webp", alt: "Poster 16 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-17.webp", alt: "Poster 17 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-18.webp", alt: "Poster 18 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-19.webp", alt: "Poster 19 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-20.webp", alt: "Poster 20 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-21.webp", alt: "Poster 21 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-22.webp", alt: "Poster 22 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-23.webp", alt: "Poster 23 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-24.webp", alt: "Poster 24 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-25.webp", alt: "Poster 25 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-26.webp", alt: "Poster 26 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-27.webp", alt: "Poster 27 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-28.webp", alt: "Poster 28 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-29.webp", alt: "Poster 29 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-30.webp", alt: "Poster 30 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-31.webp", alt: "Poster 31 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-32.webp", alt: "Poster 32 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-33.webp", alt: "Poster 33 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-34.webp", alt: "Poster 34 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-35.webp", alt: "Poster 35 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-36.webp", alt: "Poster 36 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-37.webp", alt: "Poster 37 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-38.webp", alt: "Poster 38 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-39.webp", alt: "Poster 39 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-40.webp", alt: "Poster 40 from the Posterfolio series." },
              { src: "/projects/posterfolio/poster-41.webp", alt: "Poster 41 from the Posterfolio series." },
            ],
          },
        ],
      },
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
    /*
      Green, because the product is about food and the site's default purple
      says nothing about it.

      #385A41 is the brand green and it is the `light` value — it measures
      7.8:1 on white, which is comfortably past the text bar. It cannot also
      be `dark`: on the #1e1e1e shell the same colour is 2.2:1, effectively
      invisible. So the dark-mode entries are lighter tints of the same hue
      rather than a different green, which is what keeps the two themes
      reading as one brand.

      Each value clears the bar its own role has:

      - `dark` / `light` carry TEXT and need 4.5:1 on their own canvas.
        #7CB98C is 7.3 on the shell, #385A41 is 7.8 on white.
      - `solid` is borders, rings and frame ticks — UI, not text, so 3:1.
        #5C8F69 is the tint that clears it on BOTH canvases (4.4 dark,
        3.8 light), so one ring survives a theme switch.
      - `bright` is the cursor, its tag and the comment pins: meant to be
        spotted rather than read through. White on it is 2.4:1, hence the
        near-black `ink` at 7.5:1.
      - `fill` is a card at hover, and white has to survive on it: the brand
        green gives 7.8:1, so filled surfaces stay on brand.
    */
    accent: {
      dark: "#7CB98C",
      light: "#385A41",
      solid: "#5C8F69",
      bright: "#7CB98C",
      ink: "#0E1F14",
      fill: "#385A41",
      hover: "#5C8F69",
    },
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

/*
  The homepage reel's running order, which is an editorial call and not the
  order of the array above. PROJECTS keeps its own order, so /work is
  unaffected.

  Positions 1, 4 and 7 are the full-width rows (see the ROWS rhythm in
  SelectedWorks.tsx), so those three slots carry the most weight — worth
  knowing before reordering, since moving a project between a full row and
  a paired one changes how large it renders, not just where it sits.

  Named by id rather than by position: the reel used to index into PROJECTS
  directly, which meant inserting a project anywhere near the top silently
  reshuffled the homepage.
*/
const SELECTED_IDS = [
  "mike-tyson-invitational",
  "layover",
  "elevation-capital",
  "cpgrams",
  "riviera",
  "yantra",
  "posterfolio",
];

/*
  The slugs whose case study opens dark, for the pre-paint theme script.

  Derived rather than hand-listed, so `theme: "dark"` on a project is the
  only place the fact lives. The script in app/layout.tsx runs before React
  and cannot import a component tree, so it needs this as plain data — and
  it has to be plain data at BUILD time, because a theme decided after
  hydration is a white flash on a black page.
*/
export const DARK_CASE_STUDIES: string[] = PROJECTS.filter(
  (p) => p.theme === "dark"
).map((p) => p.id);

export const SELECTED_PROJECTS: Project[] = SELECTED_IDS.map((id) => {
  const project = PROJECTS.find((p) => p.id === id);
  /* Throwing here fails the build rather than shipping a reel with a hole in
     it — every page that renders this is prerendered, so a renamed id is
     caught at build time and never reaches anyone. */
  if (!project) {
    throw new Error(
      `SELECTED_IDS names "${id}", which is not a project in PROJECTS.`
    );
  }
  return project;
});
