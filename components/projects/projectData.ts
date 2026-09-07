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

export function isStripShot(shot: ProjectShot): shot is ShotBase & {
  strip: string[];
  sliceW: number;
  sliceH: number;
  lastSliceH: number;
} {
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
      /* `newRow` forces an item to start a fresh grid row. Used where a run
         changes proportion: without it the first item of the new shape lands
         mid-row beside the old one and the row sizes to the taller of the
         two, leaving a hole. */
      items: {
        src: string;
        alt: string;
        label?: string;
        small?: boolean;
        newRow?: boolean;
      }[];
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
  | {
      kind: "specs";
      items: { name: string; value: string; note?: string; swatch?: string }[];
    }
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
      items: {
        label: string;
        value: number;
        display: string;
        tone?: "bad" | "good";
      }[];
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
      items: {
        src: string;
        alt: string;
        step: string;
        title: string;
        body: string;
      }[];
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
      items: {
        layout: "entry" | "listen" | "chat" | "review";
        label: string;
        note: string;
      }[];
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
      /*
        The beat's name. Falls back to the first item's label, which is what
        every existing call site relies on and which stops being sensible the
        moment a beat holds four screens: "01 Rest" is the name of one frame,
        not of the group it opens.
      */
      title?: string;
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
      items: {
        value: string;
        label: string;
        note?: string;
        projected?: boolean;
      }[];
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
  /*
    The two points the Details beat is built from, written rather than
    derived.

    The renderer can usually assemble these from a `brief` item plus the prose
    in a section named for the same thing, but that only works when the
    project HAS such a section. Six of them do not, and the result was a
    Challenge of twenty words sitting beside a column of screenshots. Padding
    those from elsewhere in the file produced text that was longer and off
    topic, so the answer is to write them.

    Authored here rather than as another section because this is the copy most
    likely to be revised: it is the part a reader actually judges the work on,
    and it should be editable without going hunting through nested blocks.
    When present it wins over anything the renderer would have assembled.
  */
  challenge?: string[];
  solution?: string[];
  /*
    The pictures beside the Challenge and Solution, chosen rather than picked.

    The renderer takes the first interface images it finds in section order,
    which is right for most projects and wrong for one with a tutorial in it:
    on the grievance project the column filled with onboarding frames, so the
    argument about a 15-field form was illustrated by a coach mark. Naming
    them here says "these are the screens the product IS", which no heuristic
    reading section names can work out.

    Anything listed here is also withheld from the gallery, so a screen never
    appears twice on the page.
  */
  detailMedia?: { src: string; alt: string }[];
  /*
    How much room this project's case study is allowed.

    The defaults are sized for a project with one flow in it. A product with
    two complete flows, twenty-odd distinct screens and a real explanation
    for each one is not longer because it is padded, it is longer because
    there is more of it, and capping it to four named screens throws away the
    part a designer reading the page actually wants.

    `images` is the page-wide budget BEFORE it is divided between motifs, so
    raising it is what lets one flow show more than three of its own frames.
  */
  /*
    Give every surface its own numbered section instead of one Highlights run.

    Off by default, because a project with one interface reads better as a
    single list of decisions. Turn it on for a product that is several
    separate interfaces used by different people: each section carrying a
    walkthrough then becomes its own beat, titled by that section's heading,
    so the reader can see where the traveller's app stops and the kitchen's
    portal starts without having to work it out from the screenshots.
  */
  caseChapters?: boolean;
  caseLimits?: {
    /** named screens the page shows, shared across chapters when they are on */
    highlights?: number;
    /** page-wide image budget, split across the families it finds */
    images?: number;
    /** pictures in the Gallery beat */
    gallery?: number;
  };
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
    challenge: [
      "Forge wants texture, heat and grit. Tech wants cold, flat and exact. Both at full volume is a mess with a fire filter on it.",
      "The site also has four audiences arriving at the same homepage: spectators buying tickets, amateur fighters applying to compete, partners looking to get involved, and donors. Each one wants a different page, and none of them should have to hunt for it.",
    ],
    solution: [
      "**Ratio, not blending.** 65% near black, 25% smelting orange, no more than 10% cold teal, so the forge reads as heat on a technical surface instead of the two fighting each other.",
      "The sitemap gives every audience its own route off the homepage. Tickets, fighter registration, get involved and donations each land somewhere built for that one job.",
    ],
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
                body: "The first Mike Tyson Invitational, a three day amateur boxing event in Las Vegas. Ten pages covering tickets, fighter registration, sponsorship, donations and a live stream. Designed and built end to end.",
              },
              {
                label: "Problem",
                body: "Forge wants texture, heat and grit. Tech wants cold, flat and exact. Both at full volume is a mess with a fire filter on it.",
              },
              {
                label: "Decision",
                body: "Ratio, not blending. 65% near black, 25% smelting orange, no more than 10% cold teal.",
              },
              {
                label: "Honestly",
                body: "First project at this size, with a name on the door that leaves no room for a shrug. I was nervous the whole way.",
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
                alt: "A direction board titled Headlines (Muscle: Force & Discipline), showing one content card in three densities over a dark arena plate, each with an ember gradient rail down its left edge and a red cut-corner outline on the headline.",
                label: "01 · Forge, on a component",
                note: "The heat tested on a real card rather than a headline: ember rail, cut corners, a stamped date. Three densities of the same component, because the one carrying body copy is the one that has to survive.",
              },
              {
                src: "/projects/mike-tyson/direction-atmosphere.webp",
                alt: "A direction board with a large Legend headline in off-white over an almost black architectural photograph, with teal halftone numerals reading 721 in the lower left.",
                label: "02 · Cold, atmospheric",
                note: "The opposite pole. Photography pushed nearly to black, teal numerals, no orange anywhere. Calm and expensive: and nothing in it throws a punch.",
              },
              {
                src: "/projects/mike-tyson/direction-portrait.webp",
                alt: "A hero board reading Forged in legacy. Built for the future, with a fighter lit by orange rim light on the right, supporting copy on the left and two buttons labelled Tickets and Explore.",
                label: "03 · Lit portrait",
                chosen: true,
                note: "A fighter carrying the heat instead of a texture doing it. This layout is what shipped: headline and body left, the figure right, Tickets solid against Explore outlined. The cold blue accent is the one thing that did not survive the palette ratio.",
              },
              {
                src: "/projects/mike-tyson/direction-graphic.webp",
                alt: "A direction board with no photograph: a Legend headline over flat dark teal shards, with ember gradient diagonal lines and a red circled node at the right edge.",
                label: "04 · Flat graphic",
                note: "The tech pole with the photography removed entirely: shards, a trajectory line, a circled node. It reads like a product launch, not a fight card.",
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
                body: "Legend for headlines, IBM Plex Sans for reading, Chakra Petch for numbers and labels. Chakra Petch was too good at numerals to throw away.",
              },
              {
                tag: "Texture",
                label: "Texture lives in artwork, never in UI",
                body: "Scratched metal and heat glow stay inside images and headline fills. Buttons, forms and body text stay flat.",
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
              {
                name: "Onyx Black",
                hex: "#060708",
                use: "Backgrounds, canvas, nav, footer",
              },
              {
                name: "Parchment",
                hex: "#F5F1EA",
                use: "Body text, outlines, dividers",
              },
            ],
            caption:
              "**Foundation, 65 to 70%.** Authority and depth. Most of the site is these two, quietly.",
          },
          {
            kind: "palette",
            items: [
              { name: "Ember", hex: "#450503", use: "Filled surfaces" },
              {
                name: "Smelting Red",
                hex: "#F72C25",
                use: "Primary CTAs, active states",
              },
              { name: "Heated Steel", hex: "#FF8D3C", use: "Highlights, glow" },
              {
                name: "Spark",
                hex: "#FFF893",
                use: "Rare accents, the hottest point",
              },
            ],
            caption:
              "**Accent, 20 to 25%.** The ramp runs in the order metal actually heats.",
          },
          {
            kind: "palette",
            items: [
              { name: "Gunmetal", hex: "#0F1317", use: "Background elements" },
              { name: "Slate", hex: "#162529", use: "Panels" },
              { name: "Patina", hex: "#294341", use: "Data labels" },
              {
                name: "Cold Steel",
                hex: "#3D6D67",
                use: "Numerals, timers, metallic tint",
              },
            ],
            caption:
              "**Cool tint, 5 to 10%.** The smallest budget, and the easiest one to overspend.",
          },
          {
            kind: "specs",
            items: [
              {
                name: "Primary button",
                value: "Notched corners, solid fill",
                note: "Tickets, Register, Donate",
                swatch: "#F72C25",
              },
              {
                name: "Secondary button",
                value: "Outline, parchment",
                swatch: "#F5F1EA",
              },
              {
                name: "Input height",
                value: "48px",
                note: "Dark fill, explicit focus state",
              },
              {
                name: "Field labels",
                value: "Above the input",
                note: "Never placeholder only",
              },
              {
                name: "Tags and status",
                value: "Chakra Petch, letter spaced",
                swatch: "#3D6D67",
              },
            ],
          },
          {
            kind: "statement",
            text: "Capping the teal at 10% is the only reason this reads as a forge with technology in it, rather than a tech site in an orange coat.",
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
              {
                label: "Tickets",
                children: [
                  { label: "Event Schedule" },
                  { label: "TicketTailor", note: "External" },
                ],
              },
              { label: "Event Info", children: [{ label: "Event Schedule" }] },
              {
                label: "Get Involved",
                children: [
                  { label: "Sponsorship Tiers" },
                  { label: "Sponsor Inquiry", note: "Form" },
                ],
              },
              { label: "Fighter Registration", note: "Form" },
              {
                label: "Donations",
                children: [{ label: "Donorbox", note: "External" }],
              },
              {
                label: "Merch / Shop",
                children: [{ label: "Shopify", note: "Planned" }],
              },
              { label: "Watch Live", children: [{ label: "Streaming Hub" }] },
              { label: "Media / Gallery" },
              {
                label: "Legal",
                children: [
                  { label: "Privacy" },
                  { label: "Terms" },
                  { label: "Refunds" },
                ],
              },
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
                body: "Sell a ticket, explain a format nobody has seen, register fighters, court sponsors, take donations, announce a date. It resolves as a descent: heat at the top, information in the middle, invitation at the bottom.",
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
                body: "The easy version is a montage of famous knockouts. That is someone else's story and it does not explain why an amateur invitational exists. This runs on one line instead: legacy did not end in the ring, it continued through transformation.",
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
            caption:
              "The only two frames that run the accent over budget, deliberately.",
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
                body: "Ticketing runs through TicketTailor, so the design job ends at the handoff. Sale status sits on the pages before the jump, so nobody reaches an external checkout to discover the thing they wanted is not purchasable yet.",
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
                body: "Every other page talks to someone who wants to watch a fight. This one talks to someone with a marketing budget, who needs structure and numbers rather than atmosphere. It is the most restrained page on the site, and the restraint is the pitch.",
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
                body: "Heavyweight, Middleweight, Red and Blue Corner. The hierarchy reads before any number does.",
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
                body: "Gym, date of birth, bout record, fight weight. Every one of those is a reason to abandon, so the page opens with an explicit promise about what happens next. A long form only gets finished when the reader knows why each field is there.",
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
                body: "Donations route out to Donorbox, so again the job is the run up. It is the reddest page on the site, and the only one asking for something with nothing tangible going back.",
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
                body: "Writing **65 / 25 / 10** next to the palettes did more than any single colour choice. Two clashing directions stop clashing once one is rationed, and a written number let me tell whether a screen was wrong instead of just feeling it.",
              },
              {
                title: "Scope integrations before designing around them",
                body: "The pages that went smoothly were the ones where I knew the checkout belonged to someone else. The ones that hurt were where I had already drawn one.",
              },
              {
                title: "Nervous is not unprepared",
                body: "The anxiety was about the name on the door, not the work. Exploration, palette ratios and the sitemap were all settled before a page was designed, and that is what carried it.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "elevation-capital",
    challenge: [
      "**The State of AI Adoption in Indian Startups** is research worth reading, and research usually ships as a PDF that almost nobody finishes.",
      "The findings are the whole point: **86% of founders** plan to increase AI spending, **85% of engineering teams** have moved AI into production, and productivity has become the primary proving ground. Buried in a document, none of that lands.",
    ],
    solution: [
      "The report is rebuilt as an interactive site, so the numbers **are** the interface rather than illustrations sitting inside it.",
      "Built natively in Framer with dynamic data visualisations and motion, which keeps the findings readable on a phone and lets the team publish updates without a rebuild.",
    ],
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
    challenge: [
      "Riviera is **one of the country's largest student fests**, and the site has to do two things that pull against each other: convey the scale of the whole event, and let one student find the one thing they came for.",
      "Dozens of events and sub-brands sit underneath it. Put them all on the homepage and it becomes a directory. Hide them and the fest looks smaller than it is.",
    ],
    solution: [
      "A **motion-forward homepage** carries the energy and signals the scale, so the first impression is the event itself rather than a list of its parts.",
      "Underneath that, a content architecture built to hold dozens of events and sub-brands, so the depth is there for anyone looking for it without the front page having to carry all of it at once.",
    ],
    title: "Riviera",
    logoText: "RIVIERA",
    logoUrl: "/projects/riviera-logo.webp",
    category: "Website Design",
    year: "2026",
    cover: "/projects/riviera-cover.webp",
    preview: {
      kind: "website",
      href: "https://riviera-lol.vercel.app/",
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
    cover: "/projects/cpgrams/cover.webp",
    preview: {
      kind: "website",
      href: "https://pgportal.gov.in/Signin",
      image: "/projects/cpgrams/cover.webp",
    },
    cta: "Visit Live Chatbot",
    role: "Product Design · Conversational UX",
    tools: ["Figma", "Conversational UX", "Prototyping"],
    description:
      "CPGRAMS is how you complain to the Government of India. Twenty lakh grievances a year, more than ninety ministries, and a fifteen-field form that in practice only works if you read English or Hindi. I designed a chatbot that sits on top of it. You say what went wrong, in whichever of the 22 official languages you actually think in, and it files the grievance for you.",
    extraFacts: [
      ["Client", "DARPG, Government of India"],
      ["Delivered with", "KPMG India"],
      ["Languages", "22 scheduled Indian languages"],
      [
        "Scope",
        "Conversational architecture, voice UX, UI, mascot, design system",
      ],
      ["Surfaces", "Web chatbot, mobile web"],
      ["Live at", "cpgramsaichatbot.com"],
    ],
    highlights: [
      "Speech-to-text intake in 22 languages, so filing needs no reading or writing",
      "Grievances auto-filled and routed to the correct ministry from plain speech",
      "Samadhan Didi, a lip-synced mascot who teaches the interface as you use it",
    ],
    /*
      Written rather than assembled. This is the copy the page is judged on,
      and it is the part most likely to be revised, so it lives here instead
      of being pieced together from a brief item and whatever prose happened
      to sit in a section with the right name.
    */
    challenge: [
      "The system works. The door does not. Anyone can lodge a complaint against any central department, an officer is legally obliged to answer it, and 93% of the twenty lakh filed each year get closed. That machinery is real.",
      "Getting to it is the problem. There is a 15-field form, and its second question asks which of 90+ ministries owns what happened to you. That is a filing decision, demanded before you have described anything. Add English or Hindi only, a desktop-shaped layout, a CAPTCHA and a session that quietly expires, and **six in ten people who start the form never finish it**.",
      "Which means the people the system exists for are the ones least able to reach it. A quarter of the country cannot read or write. More than 550 million citizens think in a language the portal does not speak.",
    ],
    solution: [
      "**Work out the ministry instead of asking for it. Listen for the language instead of offering a list. And show the person what you understood before anything is filed.**",
      "That turned the job from redesigning the portal into building a translation layer over it. Same ministries, same categories, same 30 to 60 day clock. The complexity does not disappear, it moves off the citizen and into the software, which already knows how government is organised.",
      "Voice carries it. Press one button, talk, and the interface switches to whatever language it heard. Everything the form used to demand gets pulled out of that one answer and handed back as a summary you check before it goes.",
    ],
    /*
      The four screens the argument above is actually about. Left to the
      picker this column filled with onboarding coach marks, because the
      tutorial section comes earlier in the file than the product does.
    */
    detailMedia: [
      {
        src: "/projects/cpgrams/voice-02.webp",
        alt: "The CPGRAMS chatbot home screen: a large microphone in the centre labelled Press to Speak, a chat history rail on the left and a text input along the bottom.",
      },
      {
        src: "/projects/cpgrams/voice-09.webp",
        alt: "The CPGRAMS chat thread showing the citizen's own voice message with a waveform player above Samadhan Didi's written reply and its spoken version.",
      },
      {
        src: "/projects/cpgrams/text-08.webp",
        alt: "The CPGRAMS Grievance Information card with a plain-language summary and the ministry resolved to NHAI.",
      },
      {
        src: "/projects/cpgrams/voice-12.webp",
        alt: "The CPGRAMS Verify Details dialog with an editable grievance summary, the ministry and category, and Close and Submit controls.",
      },
    ],
    /*
      Two complete flows, and a real explanation for each screen in them. The
      default of four named screens is right for work whose argument is three
      decisions; here the argument IS the sequence.
    */
    caseLimits: { highlights: 14, images: 200, gallery: 30 },
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
                body: "A conversation laid over India's national grievance system. Say what went wrong in any of **22 languages** and it files the complaint for you: categorised, routed, and worth exactly as much as a form submission.",
              },
              {
                label: "The problem",
                body: "You had to name which of **90+ ministries** owned your problem, in English or Hindi, on a desktop form. **Six in ten people gave up partway.**",
              },
              {
                label: "Key challenges",
                body: "The government's **taxonomy was fixed**, a quarter of the audience **cannot read or write**, and it had to work on a 2G phone.",
              },
              {
                label: "Key decisions",
                body: "**Work out the ministry** instead of asking. Listen for the language instead of offering a list. **Show what you understood before filing.**",
              },
              {
                label: "Outcome",
                body: "Live at cpgramsaichatbot.com. Filing now asks you to **speak**, not to read, write and know how government files things.",
              },
              {
                label: "What I learned",
                body: "Accessibility **was** the product, not a layer on it. And automation that hides its reasoning is **exposure, not convenience**.",
              },
            ],
          },
          {
            /*
              Written for the About beat specifically. It sits under the
              inverted statement, which is a whole screen holding one line,
              and these two paragraphs are what that line assumes.
            */
            kind: "prose",
            body: [
              "Complaining to your own government should be the easiest thing you ever do online. It is a right, it is written down, and somebody at the other end is obliged to answer. In practice it has been closer to a qualification test.",
              "So this was never really a chatbot project. It was a project about who gets to be heard, and the interface was just where that got decided.",
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
              "CPGRAMS is a promise the state makes to everyone. Lodge a grievance against any central department and an officer has to answer it inside 30 to 60 days. **90+ ministries**, **20 lakh grievances a year**, **93%** of them closed.",
              "The promise holds. The door does not. To reach it you fill a **15-field form**, and its second field asks which ministry and category your problem belongs to. You are being asked to file the complaint before you are allowed to describe it.",
            ],
          },
          {
            kind: "flow",
            steps: [
              {
                label: "Open the portal",
                sub: ["Desktop-first", "English or Hindi"],
              },
              {
                label: "Register",
                sub: ["Mobile number or email", "Before you can say anything"],
              },
              {
                label: "Pick the ministry",
                decision: true,
                sub: ["One of 90+", "Asked before you describe the problem"],
              },
              {
                label: "Pick the department and category",
                decision: true,
                sub: ["The portal's words", "Not yours"],
              },
              {
                label: "Describe the grievance",
                sub: ["In writing", "In formal language"],
              },
              {
                label: "Attach documents",
                sub: ["Nobody says which ones up front"],
              },
              {
                label: "Submit",
                sub: ["Clear a CAPTCHA", "Beat the session timeout"],
              },
              {
                label: "Get a registration number",
                sub: ["Track it with that", "An officer replies in 30 to 60 days"],
              },
            ],
            caption:
              "Eight steps, and the two hardest sit at **three and four**. You classify the problem before you have said what it is, which is backwards for anyone who does not already know how government is organised.",
          },
          {
            kind: "stats",
            items: [
              { value: "20L+", label: "grievances filed every year" },
              {
                value: "90+",
                label: "central ministries and departments covered",
              },
              {
                value: "30-60",
                label: "days an officer has to respond, by mandate",
              },
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "You have to already know the answer",
                body: "The people least able to sort their own problem into a ministry are exactly the people this exists for.",
              },
              {
                label: "Built for a machine most people do not own",
                body: "Desktop-first in a country that is **three quarters mobile**, with a **CAPTCHA** that stops the age group filing the most grievances.",
              },
              {
                label: "Two languages out of twenty-two",
                body: "More than **550 million citizens** think in a regional language the portal cannot read.",
              },
              {
                label: "One slip and the work is gone",
                body: "**Session timeouts** take everything with them. No autosave, no draft, no way back.",
              },
            ],
          },
          {
            kind: "bars",
            items: [
              {
                label: "Abandon the grievance form partway through",
                value: 60,
                display: "60%",
                tone: "bad",
              },
              {
                label: "Find government websites confusing to navigate",
                value: 52,
                display: "52%",
                tone: "bad",
              },
              {
                label: "Of rural India uses the internet regularly",
                value: 31,
                display: "31%",
                tone: "bad",
              },
            ],
            caption:
              "**Six in ten people who start a grievance never finish it.** The state simply never hears from them.",
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
              "Once I wrote that down the brief changed. I was not designing a better portal, I was designing a **translation layer** over the one that already works. Same ministries, same categories, same statutory clock. The hard part does not vanish, it moves from the person complaining to the system that already understands how it is filed.",
            ],
          },
          {
            kind: "compare",
            lanes: [
              {
                label: "The portal asks you to",
                tone: "before",
                note: "Every step is a chance to give up, and six in ten people take it.",
                steps: [
                  "Register an account",
                  "Read the interface in English or Hindi",
                  "Work out the right ministry",
                  "Work out the right category inside it",
                  "Write the grievance in formal language",
                  "Attach the right documents",
                  "Clear a CAPTCHA",
                  "Finish before the session expires",
                ],
              },
              {
                label: "The chatbot asks you to",
                tone: "after",
                note: "Everything else is inferred, filled and routed by the system that already knew it.",
                steps: ["Say what happened", "Check that it got it right"],
              },
            ],
            caption:
              "Same grievance, same destination, same **legal weight**. What moved is who has to know how government is organised.",
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
              "Two things were fixed before I started. The government's **taxonomy could not change**, and I could not assume the person filing **could read**. Between them they kill the obvious answer, because a tidier form is still a reading test with a filing test stapled to it.",
            ],
          },
          {
            kind: "compare",
            lanes: [
              {
                label: "Rejected",
                tone: "before",
                note: "Each one fixes the surface and leaves the barrier standing.",
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
                  "A conversation over the system that already exists",
                  "Voice as the primary input, not a feature",
                ],
              },
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "Move the work, do not pretend it is not there",
                body: "Somebody has to know which ministry owns a broken highway. It should be the **software**.",
              },
              {
                label: "One question at a time",
                body: "A page of fields makes you hold all of them at once. A conversation asks for one thing and waits, which keeps **working memory** free for the answer.",
              },
              {
                label: "If it listens, it should also speak",
                body: "Taking voice in and replying only in text solves the half of the problem the user could already handle.",
              },
              {
                label: "Automation needs somewhere to ask permission",
                body: "The system files a legal document on your behalf, so it has to **show you what it wrote** first.",
              },
            ],
          },
          {
            kind: "statement",
            text: "Every screen had to solve its problem in the **fewest possible clicks**.",
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
              "You cannot wireframe a chatbot the way you wireframe a page. There is no fixed layout, only a **sequence of states** and what each one is allowed to ask for. Four greyboxes settled it.",
            ],
          },
          {
            kind: "wireframes",
            items: [
              {
                layout: "entry",
                label: "01 Entry",
                note: "**One primary action**, centred. The history rail stays because **returning users recognise it** from the portal.",
              },
              {
                layout: "listen",
                label: "02 Capture",
                note: "**Live feedback** while recording. A static indicator does not reassure someone doing this for the first time.",
              },
              {
                layout: "chat",
                label: "03 Thread",
                note: "Alternating turns, input pinned. **Every message persists**, so a dropped session is not a lost grievance.",
              },
              {
                layout: "review",
                label: "04 Review",
                note: "Interpretation, detected tag, primary and secondary action. The **consent surface**.",
              },
            ],
            caption:
              "Low fidelity on purpose. Greyboxes keep the argument about **structure**, which was the only thing these had to decide.",
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
              "The shell is deliberately the one people already know from government portals: a rail on the left, the account control top right, an input along the bottom. **Recognition was worth more than novelty** here, because what this has to overwrite is whatever happened the last time they opened a .gov.in site. Inside that familiar frame, exactly one thing is allowed to be loud.",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "Centre: press to speak",
                body: "The primary action takes the **optical centre and the largest target on the page**. Nobody should have to hunt for it, and someone who cannot read the label can still find a control that size in the middle of the screen.",
              },
              {
                label: "Bottom: the text input",
                body: "Where every messaging app puts it, and where the thumb already is. Keeping it visible means **typing is never a hidden fallback**, but it sits below the microphone because voice comes first.",
              },
              {
                label: "Left rail: new chat and history",
                body: "First in the scanning order, holding the two things a returning user needs. It also does the **recovery** work: on 2G a dropped session is routine, and a half-finished grievance has to still be there when the page comes back.",
              },
              {
                label: "Top right: profile and account",
                body: "The conventional corner, deliberately **out of the task path**. Identity is something the system needs, not something the person describing a problem should be interrupted by.",
              },
            ],
          },
          {
            kind: "statement",
            text: "One screen, **one obvious action**. Everything else has to earn its place.",
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
              "A chat window is still an interface, and to someone who has never used one it is still an exam. So the product has a face. **Didi means elder sister**, the person you already ask for help with a form. She is a government worker in a saree with a departmental lanyard, and she is **lip-synced** to whatever the system says out loud.",
            ],
          },
          {
            kind: "gallery",
            compact: true,
            items: [
              {
                src: "/projects/cpgrams/mascot-v1.webp",
                label: "Direction 1",
                alt: "An early mascot exploration for CPGRAMS.",
              },
              {
                src: "/projects/cpgrams/mascot-v2.webp",
                label: "Direction 2",
                alt: "A second early mascot exploration for CPGRAMS.",
              },
              {
                src: "/projects/cpgrams/mascot-v3.webp",
                label: "Direction 3",
                alt: "A third early mascot exploration for CPGRAMS.",
              },
              {
                src: "/projects/cpgrams/mascot-v4.webp",
                label: "Direction 4",
                alt: "A fourth early mascot exploration for CPGRAMS.",
              },
            ],
            caption:
              "Four directions before she settled. The test each one had to pass: does a first-time filer read her as **staff who works here**, or as a brand character?",
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
              "Seen once, the first time someone opens the chatbot. Everything after it assumes you know you can press a button and just talk, and **no government website has ever suggested that**.",
            ],
          },
          {
            kind: "grid",
            items: [
              {
                src: "/projects/cpgrams/demo-01.webp",
                label: "01 Arrive",
                alt: "The CPGRAMS chatbot opening screen with a welcome message and the option to speak or type.",
              },
              {
                src: "/projects/cpgrams/demo-02.webp",
                label: "02 Meet the guide",
                alt: "Samadhan Didi introduced at full height beside the CPGRAMS chatbot interface.",
              },
              {
                src: "/projects/cpgrams/demo-03.webp",
                label: "03 Spotlight",
                alt: "The CPGRAMS chatbot with the interface dimmed and a single control spotlit during the tutorial.",
              },
              {
                src: "/projects/cpgrams/demo-04.webp",
                label: "04 The microphone",
                alt: "The tutorial spotlighting the microphone with Samadhan Didi explaining to press it and speak in a preferred language.",
              },
              {
                src: "/projects/cpgrams/demo-05.webp",
                label: "05 Hand over",
                alt: "The final tutorial screen of the CPGRAMS chatbot with a skip tutorial control visible.",
              },
            ],
          },
          {
            kind: "prose",
            body: [
              "The tutorial **points at the interface** rather than describing it. Spotlight masking dims everything except the control being explained, and the microphone gets the plainest sentence in the product: press it and speak in your language.",
              "**Skip sits on the first frame**, not the last. Onboarding should not tax the confident user to reassure the uncertain one.",
            ],
          },
          {
            kind: "gallery",
            items: [
              {
                src: "/projects/cpgrams/m-demo-1.webp",
                label: "Open",
                alt: "The CPGRAMS chatbot onboarding on a phone, opening state.",
              },
              {
                src: "/projects/cpgrams/m-demo-3.webp",
                label: "Spotlight",
                alt: "The phone tutorial dimming the screen around one control.",
              },
              {
                src: "/projects/cpgrams/m-demo-4.webp",
                label: "Microphone",
                alt: "The phone tutorial spotlighting the microphone button.",
              },
              {
                src: "/projects/cpgrams/m-demo-5.webp",
                label: "Hand over",
                alt: "The final phone tutorial screen with a skip control.",
              },
            ],
          },
          {
            kind: "prose",
            body: [
              "On the phone she drops to a **corner presence**. At 402px a full figure covers the control she is pointing at, which turns the guide into the obstacle.",
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
              "For a quarter of the country, reading and writing **is** the barrier. So voice is not a convenience feature here, it is the accessibility strategy. Typing is the alternative to it, not the other way round.",
            ],
          },
          {
            kind: "screens",
            items: [
              {
                src: "/projects/cpgrams/voice-01.webp",
                step: "Voice 01",
                title: "It opens with a person, not a form",
                alt: "The CPGRAMS Chatbot title screen on saffron with the departmental masthead and Samadhan Didi greeting with folded hands.",
                body: "The first thing on screen is Samadhan Didi and the name of the department, on the state's own saffron. That is deliberate. What this product has to overwrite is whatever happened the last time this person opened a government website, and being greeted by someone who looks like staff does more for that than any amount of layout.",
              },
              {
                src: "/projects/cpgrams/voice-03.webp",
                step: "Voice 02",
                title: "It listens before it asks you anything",
                alt: "The CPGRAMS voice flow recording, with a reactive orb replacing the microphone and the line Detecting Language, Please continue to speak.",
                body: "No language picker and no category dropdown, because both ask you to decide something before you have said a word. The orb reacts while you talk, on the exact control you just pressed, so there is never a doubt that it is on. One press starts and stops it: press-and-hold fails for tremor and arthritis, and the over-60s file more grievances here than anybody else.",
              },
              {
                src: "/projects/cpgrams/voice-04.webp",
                step: "Voice 03",
                title: "It says what it is waiting for",
                alt: "The CPGRAMS recording panel open with a placeholder transcript line and an instruction to click the microphone to stop recording.",
                body: "A silent pause during a wait reads as failure, especially on a connection where failure is normal. So the panel opens the moment recording starts, asks you to keep speaking while it works the language out, and says in plain words how to stop. Nothing hides behind a spinner.",
              },
              {
                src: "/projects/cpgrams/voice-05.webp",
                step: "Voice 04",
                title: "Your words come back while you are still talking",
                alt: "The CPGRAMS voice flow showing a live transcript building underneath the detected language and an elapsed recording time.",
                body: "The transcript builds live, with the detected language above it and the elapsed time beside it. This is the cheapest place in the whole product to catch a mistake. A misheard road name costs nothing here, and costs a wrongly routed grievance if it gets through.",
              },
              {
                src: "/projects/cpgrams/voice-06.webp",
                step: "Voice 05",
                title: "You get to fix it before it goes anywhere",
                alt: "The CPGRAMS editable transcript with Samadhan Didi pointing at it and a note saying mistakes can be edited here, beside a submit control.",
                body: "Didi points at the text and says, in as few words as possible, that you can edit it. Corrections go back in by voice or by keyboard, so fixing an error never demands the skill the person arrived without. Nothing moves until Submit.",
              },
              {
                src: "/projects/cpgrams/voice-07.webp",
                step: "Voice 06",
                title: "The recording stays in the conversation",
                alt: "The CPGRAMS chat thread with the citizen's voice message and waveform player kept above a card reading Identifying Relevant Ministry.",
                body: "The audio is not thrown away once it has been transcribed. It is the one thing on this page the software cannot have got wrong, so it stays in the thread as a playable message. Underneath, the system names the step it is on rather than showing a bar: identifying the relevant ministry.",
              },
              {
                src: "/projects/cpgrams/voice-10.webp",
                step: "Voice 07",
                title: "It asks for what is missing, one thing at a time",
                alt: "The CPGRAMS thread with a short answer chip reading Road name NH 45 above a Grievance Information card holding a summary and classification.",
                body: "The road name is the sort of detail the portal buried in a field called Location. Here it is one question with one answer under it. Everything gathered so far then folds into a Grievance Information card: a plain-language summary, the ministry, the category, all of it worked out from what was said instead of chosen from a dropdown.",
              },
              {
                src: "/projects/cpgrams/voice-11.webp",
                step: "Voice 08",
                title: "Documents are asked for at the moment they matter",
                alt: "The CPGRAMS grievance card with an optional document upload, an expected resolution field that also takes voice, and a Verify Details button.",
                body: "Not as a checklist on screen one, which is a reason to close the tab. The upload appears only when the grievance actually needs paperwork, and the field beside it asks what you want to happen, which the original form never bothered to ask at all. Verify Details is the only way forward from here.",
              },
            ],
          },
          {
            kind: "prose",
            body: [
              "Language is **detected from what was said, never selected from a list**. Speak Tamil and the product becomes Tamil. A picker would have been a reading test handed to people who may not read.",
            ],
          },
          {
            kind: "gallery",
            items: [
              {
                src: "/projects/cpgrams/m-voice-1.webp",
                label: "Rest",
                alt: "CPGRAMS voice flow resting state on a phone.",
              },
              {
                src: "/projects/cpgrams/m-voice-3.webp",
                label: "Listening",
                alt: "CPGRAMS voice recording on a phone with a live waveform.",
              },
              {
                src: "/projects/cpgrams/m-voice-7.webp",
                label: "Answered",
                alt: "CPGRAMS phone screen with a spoken response player.",
              },
              {
                src: "/projects/cpgrams/m-voice-9.webp",
                label: "Review",
                alt: "CPGRAMS review screen on a phone before submission.",
              },
            ],
          },
          {
            kind: "prose",
            body: [
              "The phone runs the same sequence, re-laid rather than reduced. This is the device the low-literacy user actually owns, often on **2G**, so the left rail collapses into a sheet and gives its space back to the conversation, the microphone drops into the **thumb arc** instead of the optical centre, and the summary takes the **full screen** so nothing it is asking consent for sits below the fold.",
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
              "Voice is the **priority, not the requirement**. Plenty of people would rather type, and saying a complaint out loud is not always possible in a shared house or a queue.",
            ],
          },
          {
            kind: "screens",
            items: [
              {
                src: "/projects/cpgrams/text-03.webp",
                step: "Text 01",
                title: "Typing gets the same first question",
                alt: "A typed grievance sitting in the CPGRAMS chat thread, written in ordinary conversational language.",
                body: "The input is focused and nothing else is required. The portal's first question was which of ninety ministries owns your problem. This one's is what happened, and all fifteen fields get filled out of that single paragraph.",
              },
              {
                src: "/projects/cpgrams/text-05.webp",
                step: "Text 02",
                title: "It tells you what it is doing while it does it",
                alt: "The CPGRAMS chatbot showing the detected language above a progress card reading Identifying Relevant Ministry.",
                body: "Language detected, then a progress line naming the actual step. This is the field that stopped six in ten people on the old form, and here it resolves in the background with the citizen watching rather than deciding.",
              },
              {
                src: "/projects/cpgrams/text-06.webp",
                step: "Text 03",
                title: "Every reply is spoken as well as written",
                alt: "Samadhan Didi's reply in the CPGRAMS chat, restating the complaint in text with a voice response player underneath it.",
                body: "Output parity is not a voice-flow feature. Someone who can type may still find a paragraph of official language easier to hear than to read, so the audio is always there. The reply also restates the problem before acting on it, which is comprehension you can check rather than a keyword match you have to trust.",
              },
              {
                src: "/projects/cpgrams/text-07.webp",
                step: "Text 04",
                title: "Follow-ups happen in the thread, not in a second form",
                alt: "The CPGRAMS chat with a single follow-up answered by a short message reading Road name NH 45.",
                body: "One question, one answer, then on. Working memory stays free for the answer instead of the interface, which is the whole reason a conversation beats a page of fields for somebody doing this once, under stress, on a phone.",
              },
              {
                src: "/projects/cpgrams/text-12.webp",
                step: "Text 05",
                title: "Three ways out, and none of them is the form again",
                alt: "The CPGRAMS closing card with Submit Grievance and New Chat buttons and a link to register with the Central Authority if the state categorisation is wrong.",
                body: "Submit the grievance, start again, or escalate to the Central Authority when the state-level routing looks wrong. The system is allowed to be wrong. It is not allowed to be wrong with nowhere to go, which is exactly what the old portal did every time it dropped a session.",
              },
            ],
          },
          {
            kind: "prose",
            body: [
              "**Classification happens quietly** the whole way through: the highest-friction field on the original form, resolved without anybody being asked. Conversations also persist in the left rail, because on 2G a session timeout is routine and a half-written grievance lost is usually that grievance lost for good.",
            ],
          },
          {
            kind: "gallery",
            items: [
              {
                src: "/projects/cpgrams/m-text-1.webp",
                label: "Open",
                alt: "CPGRAMS typed flow opening on a phone.",
              },
              {
                src: "/projects/cpgrams/m-text-3.webp",
                label: "Describe",
                alt: "A typed grievance on a phone screen.",
              },
              {
                src: "/projects/cpgrams/m-text-6.webp",
                label: "Assemble",
                alt: "The assembled grievance on a phone screen.",
              },
              {
                src: "/projects/cpgrams/m-text-7.webp",
                label: "Review",
                alt: "The CPGRAMS review card on a phone.",
              },
            ],
          },
          {
            kind: "prose",
            body: [
              "Typed or spoken, the phone layout is the same: rail in a sheet, input at the thumb, summary full screen. That last one is the only moment in the product where something below the fold would be a real failure rather than an inconvenience.",
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
                body: "The **highest-friction field** on the portal, and the one a citizen is least equipped to answer. Worked out from what they said, confirmed at review, never asked.",
              },
              {
                tag: "Language",
                label: "Listen for the language, do not offer a list",
                body: "A language picker is a **reading test** given to people who may not read. Detection removes the test, and the interface follows whatever it heard.",
              },
              {
                tag: "Parity",
                label: "Speak every answer, not just accept speech",
                body: "**Voice in, text out** solves half the literacy problem and then abandons the user at the half holding the answer.",
              },
              {
                tag: "Motor access",
                label: "Press, do not press and hold",
                body: "Hold-to-record fails for **tremor and arthritis**, and the **over-60s** file more grievances than anyone else on this platform.",
              },
              {
                tag: "Consent",
                label: "Show what you understood before submitting",
                body: "**Filing a legal document** for somebody needs their agreement to what it says. The review screen is where the system admits what it assumed.",
              },
              {
                tag: "Recovery",
                label: "Give a wrong answer somewhere to go",
                body: "When state-level routing is wrong, **escalation to the Central Authority is one tap** rather than starting over.",
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
              {
                name: "Saffron",
                hex: "#FE6700",
                use: "Primary action and government identity",
              },
              {
                name: "Deep",
                hex: "#9F2D00",
                use: "Pressed states and emphasis",
              },
              {
                name: "Warm",
                hex: "#FFC196",
                use: "Surfaces and the citizen's own bubbles",
              },
              { name: "Cream", hex: "#FFFBEF", use: "The chat canvas itself" },
              { name: "Ink", hex: "#333333", use: "Body copy" },
              {
                name: "Slate",
                hex: "#4A505B",
                use: "Secondary text and labels",
              },
            ],
            caption:
              "Only one of the six is loud. **Saffron carries every primary action**, which is what lets somebody who cannot read the label still find the button.",
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
              "It is **live at cpgramsaichatbot.com**, running against the real grievance system rather than sitting in a deck as a concept.",
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
                steps: [
                  "Being able to speak",
                  "Checking the system got it right",
                ],
              },
            ],
            caption:
              "The service did not change. The **qualification required to reach it** did, and that is the outcome.",
          },
          {
            kind: "prose",
            body: [
              "For **DARPG** the win is on the other side of the desk: grievances now arrive **pre-categorised and correctly routed**, work that used to land on an officer before the statutory clock even started.",
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
              "These are the targets the work was scoped against, not results it achieved. Post-launch numbers sit with the department.",
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
                title:
                  "I started out treating voice as a feature. It was the whole product.",
                body: "For a while I designed it as one of two input options. Then I tried removing it on paper, and what was left was the form again, just friendlier. If a quarter of your users cannot read or write, everything else you do is decoration. Once I accepted that, the rest of the decisions got easier: **detect the language instead of asking for it, speak every reply, never put a dropdown in the way**.",
              },
              {
                title:
                  "Letting the AI do everything quietly would have been the wrong kind of easy.",
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
    preview: {
      kind: "website",
      href: "https://mylayover.in/",
      image: "/projects/layover-cover.webp",
    },
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
      "A layover is dead time you have already paid for. Layover turns it into something usable: put in your airport or your PNR and it shows what is actually open in your terminal right now, so you can order a meal to your gate or book a lounge seat. I joined at zero and took it to four surfaces: the site people land on, the app they order from, the portal a restaurant runs its kitchen on, and the console the whole platform is operated from.",
    extraFacts: [
      ["Timeline", "2024 to 2026"],
      ["Scope", "Research, IA, user flows, UX, UI, brand, design system"],
      [
        "Surfaces",
        "Marketing site, web app, mobile app, vendor portal, admin console",
      ],
      ["Airports", "Delhi IGI, Mumbai CSIA, Bengaluru KIA, Hyderabad RGIA"],
      ["Outcome", "Funded; pilot talks underway with Indian airports"],
    ],
    highlights: [
      "Terminal-aware delivery, so every restaurant card carries its pier",
      "Veg and non-veg filters promoted to a first-class control",
      "Live prep timer, so you know whether you have time before boarding",
    ],
    /*
      Written rather than assembled. The renderer can usually build these
      out of a brief item plus the prose in a section named for the same
      thing, and on a project with four audiences it produces a Challenge
      that is only about one of them.
    */
    challenge: [
      "You are standing in a building full of food and lounges with no way to know what is open, how far away it is, or whether you have time to get there and back before boarding. That is the traveller's half of it.",
      "The outlet's half is the mirror image: a counter, a paper queue, and no idea how many people are about to walk up. Terminal restaurants had **no listing, no live menu and no way to take an order ahead**. Lounge access was a guess you confirmed at the desk, in front of a line.",
      "The category is not short on supply either. The dominant player already holds the bank, airline and lounge partnerships. What it does not have is a product anyone wants to open twice, and it sits at **two stars**. Nobody had built the layer between the two sides.",
    ],
    solution: [
      "**Treat it as a time problem, not a food problem.** The moment that landed, every screen resolved: the prep-time badge stopped being a detail and became the loudest thing on a card, Get Directions earned equal weight with Order Now, and the QR code stopped being a payment feature and became a queue-removal feature.",
      "Then build all four sides of it, because none of them works alone. A traveller who orders is only fed if the kitchen sees the ticket. The kitchen is only on the platform if somebody approved it. And none of that matters if the person googling from the departure gate cannot find the site.",
      "Same system across all four, **opposite temperature**. Dark and warm for travellers, light and dense for operators, because one is read on a phone in a dim terminal and the other under a fluorescent tube at arm's length.",
    ],
    /* the two presentation frames, which are about the product as a whole
       rather than about any one of its four surfaces */
    detailMedia: [
      {
        src: "/projects/layover/hero.webp",
        alt: "The Layover landing page hero on a laptop, showing the headline Order Meals, Access Lounges, All In One App above an airport picker listing four Indian airports.",
      },
      {
        src: "/projects/layover/system.webp",
        alt: "Layover's dark marketing site shown beside two phone screens of the ordering app.",
      },
    ],
    /* four interfaces, so four beats rather than one long Highlights run */
    caseChapters: true,
    caseLimits: { highlights: 20 },
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
                body: "The layer that turns a layover into usable time. **FoodSync** puts every outlet in your terminal into one live menu; **LoungeSync** checks whether your card gets you in, books the seat and opens the gate with a QR code. I joined at zero and took it to **four shipping-ready surfaces**.",
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
                body: "I was asked for a food app. What the traveller needed was an answer to **will I make my flight**: identical on a wireframe, nothing alike in a terminal.",
              },
            ],
          },
          {
            /* written for the About beat, which is a whole screen holding one
               sentence and needs two paragraphs that say what it assumes */
            kind: "prose",
            body: [
              "Every airport sells you the same thing twice: a ticket out, and the two hours you have to spend before you can use it. The second one is a service nobody had bothered to design.",
              "So this was never really a food-ordering project. It was an attempt to make an airport legible for the ninety minutes you are stuck inside it, which turned out to need four products rather than one.",
            ],
          },
        ],
      },
      {
        name: "problem",
        heading: "Two people, the same problem, opposite ends",
        blocks: [
          {
            kind: "prose",
            body: [
              "The traveller wants to know **how long**. The outlet wants to know **how many**. They are twenty metres apart and there is nothing between them.",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "Lounge access was a guess",
                body: "Membership rules nobody could parse and **no live seat availability**. You found out at the counter, in front of a queue.",
              },
              {
                label: "Terminal food was invisible",
                body: "Outlets had **no digital presence at all**. No listing, no live menu, no way to compare, no way to order ahead.",
              },
              {
                label: "The demand was already there",
                body: "People in airports will pay for comfort. **Counter-and-paper systems** on both sides were the only thing in the way.",
              },
            ],
          },
          {
            kind: "bars",
            items: [
              {
                label: "Global airport lounge market, growing 15% a year",
                value: 100,
                display: "$5.71B",
                tone: "good",
              },
              {
                label: "Airports worldwide, almost none connected end to end",
                value: 62,
                display: "10,000+",
                tone: "bad",
              },
              {
                label:
                  "Play Store rating of the incumbent that owns the partnerships",
                value: 40,
                display: "2 stars",
                tone: "bad",
              },
            ],
            caption:
              "The last number is the opening. **The category is not short on supply**: the dominant player already holds the bank, airline and lounge deals. What it does not have is a product anyone wants to open twice.",
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
              "Once that was written down, the screens stopped arguing with each other. A prep-time badge went from a detail to the most important element on a card. **Get Directions earned the same weight as Order Now**, because food you cannot find in time is worth nothing. The QR code stopped being a payment feature and became a way to not stand in a line.",
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
              "I mapped the whole journey before drawing a single screen. The first structure came out **eleven clicks deep**, for somebody in a terminal, holding a bag, watching a departure board.",
            ],
          },
          {
            kind: "flow",
            steps: [
              {
                label: "Land",
                sub: ["Airport or PNR", "No account asked for"],
              },
              { label: "Terminal", sub: ["Sets everything after it"] },
              {
                label: "Outlets",
                sub: ["Veg or non-veg", "Pier and prep time"],
              },
              { label: "Menu", sub: ["Live availability"] },
              { label: "Cart", sub: ["Edit before committing"] },
              {
                label: "Account",
                decision: true,
                sub: ["Requested here, not earlier"],
              },
              { label: "Pay", sub: ["Single confirm"] },
              {
                label: "Track",
                sub: ["Ready in 20 minutes", "Directions to the pier"],
              },
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
              "The front door, and for most people the whole product until they install anything. It took **six labelled passes** to get here. The version that shipped stops explaining Layover and starts being it: the airport picker lives inside the hero, so the first thing the site does is the first thing the product does.",
            ],
          },
          {
            kind: "screens",
            items: [
              {
                src: "/projects/layover/web-landing.webp",
                step: "Web 01",
                title: "The hero does the product's job, not the product's pitch",
                alt: "The full Layover landing page: a dark airport hero with an airport picker, a three-step explainer, a lounge teaser marked coming soon, and an app download section.",
                body: "Three lines of copy, then a live airport picker. Earlier passes opened with a carousel and a paragraph explaining what a layover is, which every traveller already knows. Pick an airport and the next thing it asks is which terminal, in a dialog it will not let you skip: that looks like friction and is the opposite, because nothing on the page after it is true until it knows. Everything further down is ordered by distance from the payoff: the three-step explainer, the lounge tease, the app download, the footer.",
              },
              {
                src: "/projects/layover/order.webp",
                step: "Web 04",
                title: "Four questions on the card, then a countdown",
                alt: "Layover's outlet directory, with Get Directions and Order now on every card, beside an Order Confirmed screen showing a twenty-minute ready timer, the itemised order and a map.",
                body: "The directory on the left answers four questions before you click anything: who, how far, how good, how long. **The pier replaces the street address**, because in a terminal where is the only question that matters, and Veg and Non-Veg sit in the header beside All rather than behind a Filters drawer. Then, once the order is in, the only thing that matters is the number of minutes. The itemised order, the outlet's phone number and the map stay under it, so when something goes wrong you are ten metres from the person who can fix it.",
              },
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
              "The app is for the people who fly often enough to install something. It opens on the only question that matters, **which airport and which terminal**, because until it knows that nothing it could show you is true.",
            ],
          },
          {
            /*
              Four at a time, not one at a time.

              These are full-page phone captures at 660x2577. One per beat
              rendered each of them as tall as three screenfuls with half the
              column empty beside it, which is a wall rather than a flow. Four
              across is how a case study actually shows a sequence, and the
              two beats are split by proportion as well as by subject: the
              short screens sit together and the long scrolls sit together,
              so no cell has to letterbox its neighbour.
            */
            kind: "step",
            title: "Arriving, and getting located",
            items: [
              {
                src: "/projects/layover/app-signup.webp",
                label: "01 Splash",
                alt: "The Layover app splash screen: the wordmark on near-black with a faint grid.",
              },
              {
                src: "/projects/layover/app-onboarding.webp",
                label: "02 Onboarding",
                alt: "A Layover app onboarding card with a 3D burger illustration, the line Hungry before your flight, and a Skip control in the top right.",
              },
              {
                src: "/projects/layover/app-location.webp",
                label: "03 Airport",
                alt: "The Layover app airport picker opening as a sheet over the home screen, with a grid of airport tiles.",
              },
              {
                src: "/projects/layover/app-location-type.webp",
                label: "04 Terminal",
                alt: "The Layover app location sheet with Delhi selected and radio groups for flight type, travel type and terminal above a Continue button.",
              },
            ],
            body: [
              "The onboarding says what the app does and gets out of the way. **Skip sits on the first frame, not the last**, because making a confident user sit through three screens to reassure an uncertain one is a tax paid by the wrong person.",
              "Then the only question that matters. Domestic or international decides which piers you can reach and the terminal decides the entire menu, so all of it is asked once, up front, as radio buttons rather than a search, and stays editable from the header on every screen after this. **Sign-up took thirteen versions** before it ended up behind the browsing instead of in front of it.",
            ],
          },
          {
            kind: "step",
            title: "Choosing, and paying",
            items: [
              {
                src: "/projects/layover/app-home.webp",
                label: "05 Outlets",
                alt: "The Layover app home screen headed Departures, Terminal 3, with a veg toggle, a Food and Cafe split, and outlet cards each showing a rating and a ten to fifteen minute prep time.",
              },
              {
                src: "/projects/layover/app-menu.webp",
                label: "06 Menu",
                alt: "A McDonald's menu inside the Layover app, with a ten to fifteen minute prep time under the outlet name, a veg toggle, a Bestsellers section and a Coffee grid.",
              },
              {
                src: "/projects/layover/app-menu-option.webp",
                label: "07 Jump to section",
                alt: "The Layover app menu with a floating section list open over it, listing each menu section and its item count.",
              },
              {
                src: "/projects/layover/app-cart-pay.webp",
                label: "08 Pay",
                alt: "The Layover app cart with four items, an add-ons row, an applied coupon, and an expanded To Pay panel listing item total, GST, platform fee and platform fee GST above a sticky Pay button.",
              },
            ],
            body: [
              "**Prep time is the loudest thing on every card**, and it follows you down from the outlet into the menu header. On a restaurant app the price decides; in a terminal the clock does. The veg toggle sits top right where a thumb reaches it, the veg mark repeats on every item rather than living only in a filter, and the floating jump control exists because an airport menu is long and you are reading it standing up with a bag on your shoulder.",
              "The bill is itemised before the button: item total, GST, platform fee, and the platform fee's own GST, all visible without expanding anything. Airport pricing is what travellers are most suspicious of, so hiding a line here would cost more trust than the line is worth. **This is also where the account is finally asked for**, and not one screen earlier.",
            ],
          },
        ],
      },
      {
        name: "vendor portal",
        heading: "The restaurant portal",
        blocks: [
          {
            kind: "prose",
            body: [
              "Here the visual system flips. An order queue is read **standing up, under fluorescent light, at arm's length**, by somebody whose hands are full. So it goes light, flat and high contrast, with nothing decorative competing with a number.",
            ],
          },
          {
            kind: "screens",
            items: [
              {
                src: "/projects/layover/vendor-onboarding.webp",
                step: "Vendor 01",
                title: "Six steps, and a straight answer at the end of them",
                alt: "The six-step Layover vendor onboarding flow laid out left to right: registration, contact verification, document upload, and an application submitted confirmation.",
                body: "Registration, contact verification, documents, review. The last frame does the thing most onboarding flows skip: it says what happens next and how long it takes, **34 to 48 hours**, with the checks listed. An airport outlet signing up to a platform they have never heard of needs that more than they need a prettier form.",
              },
              {
                src: "/projects/layover/vendor-dashboard.webp",
                step: "Vendor 02",
                title: "One incoming order, and a wall of everything else",
                alt: "The Layover vendor dashboard: a single incoming order card with large Accept and Reject buttons above a grid of order cards marked Ready or Delivered with live timers.",
                body: "The new order takes the top of the screen on its own, with **Accept and Reject as the two largest targets on the page**. Everything already accepted drops into the grid below, colour-coded Ready or Delivered with a timer running on each. There is no navigation to learn, because the whole job lives on one surface.",
              },
              {
                src: "/projects/layover/vendor-menu.webp",
                step: "Vendor 03",
                title: "Menus edited where they are read",
                alt: "The Layover vendor menu manager showing Recommended, Drinks and Burgers sections of item cards, each with an availability toggle and an inline edit control.",
                body: "Sections and items sit the way the traveller will see them, and each is edited in place rather than through a separate builder. Availability is a toggle on the card itself: a stale menu in an airport means a refunded order and a passenger who has already boarded, so turning one item off has to cost one tap.",
              },
              {
                src: "/projects/layover/vendor-empty.webp",
                step: "Vendor 04",
                title: "The screen a new outlet actually sees first",
                alt: "The empty menu state in the Layover vendor portal: an illustration, the line Add Your First Section, and a single Add Section button.",
                body: "A vendor's first login shows a menu with nothing in it. **That is their first impression of the entire platform**, so it got the same attention as the dashboard: one illustration, one sentence, one button, and the same Add Section control that lives in the header, so the thing you learn here still works tomorrow.",
              },
              {
                src: "/projects/layover/vendor-coupons.webp",
                step: "Vendor 05",
                title: "Build it on the left, watch it appear on the right",
                alt: "The Layover coupons screen with an Add New Coupon form on the left, a list of active and expired coupons below it, and a live coupon preview with a QR code on the right.",
                body: "The form and the coupon it produces sit side by side, so the outlet sees what the traveller will see while they are still typing. Coupons ship with a **QR code** because half of airport promotion happens on a printed standee next to the till, not inside an app.",
              },
              {
                src: "/projects/layover/vendor-analytics.webp",
                step: "Vendor 06",
                title: "Revenue, and the shape of an airport day",
                alt: "The Layover vendor revenue screen with today's sales and orders, a monthly revenue bar chart, an activity-by-time line chart, top selling items, average order value and repeat rate.",
                body: "Today against yesterday at the top, then the month, then **Activity by time**, which is the chart that actually earns its place here. An airport kitchen staffs against flight banks rather than against lunch and dinner, and this is the only screen in the product that shows them where those banks are.",
              },
            ],
          },
        ],
      },
      {
        name: "admin console",
        heading: "The admin console",
        blocks: [
          {
            kind: "prose",
            body: [
              "The layer nobody sees and everything depends on. Built for **scanning rather than exploring**: four navigation items, and every vendor row surfacing the same four metrics in the same four positions, so a hundred outlets read at the speed of one.",
            ],
          },
          {
            kind: "screens",
            items: [
              {
                src: "/projects/layover/admin-onboarding.webp",
                step: "Admin 01",
                title: "Approve or reject, with the whole case on one row",
                alt: "Layover's admin vendor onboarding screen listing pending applications, each showing contact person, category, submission date, email and phone with View, Approve and Reject controls.",
                body: "Contact, category, submitted date, the documents behind a View, then the two decisions. Everything needed to make the call sits on the card, so approving a vendor never turns into a tab-switching exercise. **Add New Vendor** is in the corner for the outlets that get onboarded in a meeting rather than through the form.",
              },
              {
                src: "/projects/layover/admin-vendors.webp",
                step: "Admin 02",
                title: "Orders, revenue, rating, prep time. Always in that order.",
                alt: "Layover's vendor management screen, each outlet a row with orders, revenue, rating and prep time in fixed positions, an active toggle, and Order History and Manage controls.",
                body: "Four metrics, four fixed positions on every row, and one switch that takes an outlet offline. Prep time is on this list for the same reason it is on the traveller's card: **it is the number that predicts a complaint.** Manage opens that vendor's own portal, so support never has to describe a screen down a phone.",
              },
              {
                src: "/projects/layover/admin-vendor-menu.webp",
                step: "Admin 03",
                title: "Admin can fix a menu without asking anyone",
                alt: "The admin's view of a vendor's menu inside Layover's admin console, showing item cards with prices, prep times and veg marks, each with edit and delete controls and an Add Item button.",
                body: "At launch an outlet's first menu upload is rarely right: wrong prices, missing veg marks, an item that does not exist any more. So admin can correct it directly, and **the edit screens here are identical to the vendor's own**, because two interfaces for the same job is how the two drift apart.",
              },
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
                body: "Browsing is free. The account is asked for **only at the moment it becomes necessary**.",
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
              "None of it arrived fully formed. The site went through **six labelled passes**: a first structure, a restructure, a wide exploration board, a near-final, a final, and the final that actually shipped.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/layover/iterations.webp",
              wide: true,
              caption:
                "One pass, as it sits on the canvas. **Ten full page layouts explored side by side** before anything was chosen, and this is the first of six such boards.",
              alt: "A Figma canvas board holding ten full-page dark website layouts for Layover arranged in a grid.",
            },
          },
          {
            kind: "prose",
            body: [
              "Between the first board and the last, the hero went from an empty carousel shell to a working airport picker, and the listing went from **four unlabelled tiles to cards carrying four data points each**.",
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
              {
                name: "Gold",
                hex: "#C9A769",
                use: "Accents, active states, the brand's voice",
              },
              {
                name: "Bronze",
                hex: "#7C6A46",
                use: "Primary brand, borders and fills",
              },
              {
                name: "Gold Light",
                hex: "#FDCE77",
                use: "Emphasis on dark, badges",
              },
              { name: "Ink", hex: "#0D0D0D", use: "The consumer surface base" },
              {
                name: "Surface",
                hex: "#1E1E1E",
                use: "Elevated cards on dark",
              },
              {
                name: "Alert",
                hex: "#F65F5F",
                use: "Reject, non-veg, destructive",
              },
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
        ],
      },
      {
        name: "outcome",
        heading: "What changed",
        blocks: [
          {
            kind: "prose",
            body: [
              "**The company raised on this work**, and pilot conversations with Indian airports are underway. The designs did double duty as the product spec and as the fundraising material.",
              "For travellers, an eleven-click structure became a flow where **location, terminal and wait time are answered before anybody asks**. For outlets, demand became visible before it arrived, and the order queue became one glanceable wall instead of a counter and a shout.",
            ],
          },
          {
            kind: "results",
            items: [
              {
                value: "4",
                label: "surfaces designed end to end, starting from nothing",
              },
              {
                value: "6",
                label: "full iteration passes on the marketing site",
              },
              { value: "13", label: "versions of the sign-up screen alone" },
            ],
            caption:
              "These count what got designed, not how it performed. The product has not launched to the public yet, so there are no usage numbers to report and I am not going to invent any.",
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
              "The hardest part of a 0-to-1 project is **resisting the urge to design the thing you were asked for**. I was asked for a food-ordering app. What the traveller needed was an answer to whether they would make their flight. Those two look identical on a wireframe and behave nothing alike in a terminal.",
              "Designing for four users at once is not four times the work, it is a different kind of work. The value was never in any individual screen. It was in making sure **a decision made on the traveller's screen still made sense to the person in the kitchen** twenty metres away, and to whoever had to approve that kitchen in the first place.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "yantra",
    challenge: [
      "Yantra is a week of technical events, workshops and hackathons, spread across formats and audiences. There was no single place for a student to see what was on and sign up for it.",
      "A technical fest also has to feel worth a week of someone's time. A page that only lists things reads like a timetable, which is not a reason to turn up.",
    ],
    solution: [
      "A **3D interactive environment** as the front door, so the fest is something you enter rather than something you scroll past.",
      "Behind it, a unified portal covering technical events, workshops and hackathons in one place. The experience does the persuading and the portal does the work.",
    ],
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
    /* a brand system with a full deep dive behind it, so it belongs in both */
    alsoCaseStudy: true,
    title: "DropBy",
    logoText: "dropby.",
    logoUrl: "/projects/dropby-logo.webp",
    category: "Brand Identity",
    year: "2024",
    cover: "/projects/dropby-cover.webp",
    preview: {
      kind: "website",
      image: "/projects/dropby-cover.webp",
      href: "https://www.behance.net/gallery/230479963",
    },
    cta: "View Full Project on Behance",
    /*
      Bandis Blue, the identity's own primary, sampled off the palette board.
      It sits almost exactly on the line in both themes (3.91:1 on the dark
      canvas, 4.45:1 on white), so TEXT uses a lighter blue in dark mode and a
      deeper one in light, while `solid` keeps the true brand value for
      borders and rings where the 3:1 UI bar applies.

      `fill` is the brand blue itself and carries white at 4.45:1, so unlike
      the lighter-accent projects here it needs no dark ink override.
    */
    accent: {
      dark: "#4D9BFF",
      light: "#0057CC",
      solid: "#006FFF",
      bright: "#66AAFF",
      ink: "#04122B",
      fill: "#006FFF",
    },
    role: "Brand Identity",
    tools: ["Figma", "Illustrator", "Photoshop"],
    description:
      "DropBy is a real-world presence engine for people who want to meet, but on their own terms: it rewards you for showing up rather than for posting. The old brand did not say any of that. This is the rebrand, built around a radar that borrows the app's own drop mechanic and a voice loud enough to get somebody off the sofa.",
    extraFacts: [
      ["Scope", "Identity, logo, colour, design system, campaign"],
      ["Team", "Crestic Era"],
      ["Published", "Behance, July 2025"],
    ],
    highlights: [
      "Radar-based system taken straight from the app's core drop mechanic",
      "Palette rebuilt around one loud blue, with warm accents to break it",
      "Out-of-home campaign written to sound like a person, not a platform",
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
                body: "A rebrand for **DropBy**, an app for socially curious people who want to meet in person without the performance. It rewards **showing up**, not posting.",
              },
              {
                label: "The problem",
                body: "The old identity **felt shy**. No cohesion, no typographic clarity, no colour strategy, and nothing to say.",
              },
              {
                label: "The idea",
                body: "Take the product's own **drop mechanic**, the radar ping, and make it the brand's building block.",
              },
              {
                label: "The system",
                body: "One loud blue, warm accents to break it, a **bolder sans**, and a repeating radar element.",
              },
              {
                label: "The voice",
                body: "Campaign lines written as things a person would actually say. **Just Drop By.**",
              },
              {
                label: "Team",
                body: "Made with **Crestic Era**.",
              },
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/dropby/statement.webp",
              alt: "An opening slide on DropBy blue reading: we reimagined DropBy into a brand that gets people to show up.",
              caption: "The brief, in one line.",
              wide: true,
            },
          },
        ],
      },
      {
        name: "problem",
        heading: "A brand that did not ask for anything",
        blocks: [
          {
            kind: "prose",
            body: [
              "An app whose entire premise is **getting somebody to leave the house** was speaking in a voice that could be ignored. The identity was quiet and unsure of itself, and it read as a product that did not mind whether you turned up.",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "No visual cohesion",
                body: "Nothing tied one screen, post or asset to the next, so nothing accumulated into a brand.",
              },
              {
                label: "No clarity in the type",
                body: "The typography carried **no hierarchy and no attitude**, which left every message weighted the same.",
              },
              {
                label: "No colour strategy",
                body: "Colour was decoration rather than a system, so it could not be used to **mean** anything.",
              },
              {
                label: "Nothing to say",
                body: "The messaging never made the case for the product's whole point: **turning up in person**.",
              },
            ],
          },
        ],
      },
      {
        name: "essence",
        heading: "Brand essence",
        blocks: [
          {
            kind: "figure",
            shot: {
              src: "/projects/dropby/essence-radar.webp",
              alt: "A dark frame with a wide gradient arc sweeping from red through blue, and the word Encourage in a pill at its centre.",
              caption:
                "Encourage, set inside the radar sweep the whole system is built from.",
              wide: true,
            },
          },
          {
            kind: "prose",
            body: [
              "The essence landed on **encouragement** rather than connection, which is the word every social product already uses. Encouragement is what the product actually does: it gives a hesitant person a **reason and a nudge** to show up.",
              "The radar sweep behind it comes straight from the app's **drop**, so the brand's central shape is a thing the product already does rather than an ornament chosen for it.",
            ],
          },
        ],
      },
      {
        name: "logo",
        heading: "Logo",
        blocks: [
          {
            kind: "figure",
            shot: {
              src: "/projects/dropby/logo.webp",
              alt: "The DropBy wordmark in white on the brand blue, set in a geometric sans with a small trademark symbol.",
              caption: "The wordmark, set in a heavier geometric sans.",
              wide: true,
            },
          },
          {
            kind: "prose",
            body: [
              "A **bolder geometric sans**, tightly set, with the trademark mark kept small so it reads as a brand rather than a startup logotype. The lowercase b and y keep it friendly at the size it actually lives at, which is a phone screen and a poster seen from across a street.",
            ],
          },
        ],
      },
      {
        name: "colour",
        heading: "Colour concept",
        blocks: [
          {
            kind: "prose",
            body: [
              "One blue does the work, and the warm accents exist to stop it becoming another polite tech palette. **Rich Black** and **Alice Blue** carry the quiet moments so the loud colours stay loud.",
            ],
          },
          {
            kind: "palette",
            items: [
              {
                name: "Bandis Blue",
                hex: "#006FFF",
                use: "The primary, and the only colour allowed to shout",
              },
              {
                name: "Rich Black",
                hex: "#0D0F1E",
                use: "Canvas for the night-side of the brand",
              },
              { name: "Alice Blue", hex: "#F5F8FE", use: "The light canvas" },
              {
                name: "Munsell",
                hex: "#EF013D",
                use: "Accent, and the hot end of the gradient",
              },
              { name: "Tomato", hex: "#FF4A2C", use: "Warm accent for energy" },
              {
                name: "Cleste",
                hex: "#97F2FF",
                use: "Cool accent, the cold end of the sweep",
              },
              {
                name: "Vanilla",
                hex: "#FFECB3",
                use: "Softener, used sparingly",
              },
            ],
            caption:
              "The accents are what keep it human. A blue-only system would have been **calm**, and calm is the wrong instruction for an app asking you to go and meet somebody.",
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/dropby/palette.webp",
              alt: "The DropBy palette board showing Alice Blue, Rich Black, Bandis Blue, Munsell, Tomato, Cleste and Vanilla, with a full spectrum gradient strip underneath.",
              caption:
                "The board as presented, with the gradient the accents resolve into.",
            },
          },
        ],
      },
      {
        name: "system",
        heading: "Building a design system",
        blocks: [
          {
            kind: "figure",
            shot: {
              src: "/projects/dropby/brand-element.webp",
              alt: "A tiled pattern of overlapping gradient rings in blue, red and orange, labelled brand element in action.",
              caption: "The ring, repeated into a pattern the brand can own.",
              wide: true,
            },
          },
          {
            kind: "prose",
            body: [
              "The radar ring is the **one element everything else is made from**. Alone it is a ping. Repeated it becomes a pattern, a background, a crop on a poster, a frame around a face. That is what makes it a system rather than a logo with decoration around it: **the same shape survives every size** it has to work at.",
            ],
          },
        ],
      },
      {
        name: "campaign",
        heading: "Out in the world",
        blocks: [
          {
            kind: "step",
            items: [
              {
                src: "/projects/dropby/posters-street.webp",
                label: "01 Didn't plan to meet",
                alt: "Three street posters: two photographic panels reading didn't plan to meet and but glad I dropped by, with a blue DropBy panel between them, connected by a gradient arc.",
              },
              {
                src: "/projects/dropby/posters-wall.webp",
                label: "02 Real vibes",
                alt: "Three posters on a concrete wall reading real vibes, random meets and stories don't start by chance, beside a photographic DropBy panel.",
              },
            ],
            body: [
              "The lines are written as **half-sentences that finish across panels**, so the arc carries your eye from one to the next and the campaign only completes if you read the set. It is the radar doing the work again, this time as a connector between two strangers on two different posters.",
              "The copy stays in **spoken register**: didn't plan to meet, but glad I dropped by. Nothing there sounds like a platform describing its features.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/dropby/billboard.webp",
              alt: "A wide billboard reading Just Drop By over a photograph of three people laughing, with body copy about valuing depth over display.",
              caption:
                "The billboard, where the brand states its case in full.",
              wide: true,
            },
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/dropby/banners.webp",
              alt: "Vertical banners hung between the columns of a stone building, alternating black Are You Alone panels with blue DropBy panels.",
              caption: "Banners, alternating the question with the answer.",
              wide: true,
            },
          },
          {
            kind: "prose",
            body: [
              "**Are you alone** is the most direct thing in the system, and it only works because the answer is hanging beside it. Asked on its own it would be bleak. Asked next to the wordmark it is **an invitation**.",
            ],
          },
        ],
      },
      {
        name: "credits",
        heading: "Credits",
        blocks: [
          {
            kind: "prose",
            body: ["Made with **Crestic Era**. Full project on **Behance**."],
          },
        ],
      },
    ],
  },
  {
    id: "futurepreneurs",
    challenge: [
      "A campus event site is read once, fast, on a phone, usually while deciding whether to sign up. Everything on it competes with **the one thing that matters: the deadline.**",
      "A tenth edition also has to look like one. The easy version is fest-poster maximalism, which is exactly what makes a student event look like a student event.",
    ],
    solution: [
      "**Lead with the countdown, not the copy.** The clock is the first thing on the page, and the deadline is never more than a scroll away from wherever you are.",
      "Five dates get their own visual system so the timeline reads as a sequence rather than a list, and **one accent colour** carries the whole page. Built in Framer so the team could run a multi-week campaign without a developer.",
    ],
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
      ["Edition", "10.0: Xth edition"],
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
                body: "The event site for **Futurepreneurs 10.0**, the flagship business simulation run by the **Entrepreneurship Cell at VIT Vellore**. Registration, timeline, the story of the format and a live countdown to the day itself: one page carrying all of it.",
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
              "The masthead sets **FUTURE PRENEURS** against a single outsized **X**: the tenth edition as a graphic device rather than a line of copy. Below it, the only number anyone acts on: time left to register, counted in days, hours and minutes.",
              "Everything else on the first screen is subordinate to those two elements. The gradient field behind them is the one place the design allows itself colour.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/hero.webp",
              wide: true,
              caption:
                "The landing view: masthead, register, and the countdown everything else defers to.",
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
                "Futurepreneurs 10.0: the flagship event of the Entrepreneurship Cell, VIT Vellore.",
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
              "Two families doing different jobs. **Whyte Inktrap** carries the display weight: its cut-in traps keep the masthead sharp at poster scale. **Gantari** and **Almarai** handle everything a person has to actually read.",
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
              caption:
                "Slateblue, Sorrell Brown, and the two neutrals holding the structure.",
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
                "Research, ideate, wireframe, UI concept, design: staggered rather than sequential.",
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
              "The timeline is the component the whole page turns on. Five dates: registration opening, closing, two qualifier stages and the D Day: built as numbered cards on a connecting line, so the sequence reads at a glance rather than being parsed as a list.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/elements.webp",
              wide: true,
              caption:
                "The timeline component, and the same page held to a phone.",
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
              "Desktop and mobile side by side, full scroll. The same five sections in both: masthead and countdown, the pitch for the simulation, the timeline, ten years of history, then FAQs and the E-Cell footer.",
              "The mobile view is not the desktop one narrowed. The timeline reflows from a five-across row into stacked pairs, and the three-column explainer becomes a single column of cards: the two places where the desktop layout would have collapsed into something unreadable if it had simply been squeezed.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/futurepreneurs/fullview.webp",
              wide: true,
              caption:
                "The full page in both views: webview left, mobview right.",
              alt: "Full-length screenshots of the Futurepreneurs site: the desktop page beside the mobile page, both showing masthead, timeline, ten-years section, FAQs and footer.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "posterfolio",
    challenge: [
      "**One canvas, 4:5.** Every poster gets the same rectangle, so nothing can be solved by changing the shape of the page. Composition, type and contrast are the only variables left.",
      "Most of these are read at **thumbnail scale first**, in a feed or on a contact sheet. A layout has to survive being small before it earns being large.",
    ],
    solution: [
      "Every poster is judged at thumbnail size before it is judged at full size. If the idea does not survive that, the composition changes rather than the type getting bigger.",
      "Running one format across **41 subjects**, from startup teardowns to title cards, is what makes it a practice rather than a campaign. The constraint stays fixed, so the thinking is the part that has to move.",
    ],
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
      "A running series of posters: startup teardowns, product launches, editorial covers, merch and title cards. One format, held across dozens of subjects, as a way of practising composition and type under a fixed constraint.",
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
                body: "An ongoing set of **41 posters** covering startup teardowns, product launches, editorial covers, streetwear merch and title cards. Not a campaign: **a practice**, run at one format over a long stretch.",
              },
              {
                label: "The constraint",
                body: "**One canvas, 4:5.** Every poster gets the same rectangle, so nothing can be solved by changing the shape of the page.",
              },
              {
                label: "What it is for",
                body: "Most of these are read at **thumbnail scale first**: a feed, a grid, a contact sheet. The layout has to survive being small before it earns being large.",
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
        /*
          Ordered by proportion, not by filename. Thirty-five of these are
          4:5 and six are square; interleaved, every square left a hole under
          it in a row sized by its taller neighbours, and the contact sheet
          read as ragged rather than as one set. The squares now sit together
          at the end, and the first of them starts a new row so the two
          formats never share one.
        */
        name: "posters",
        heading: "",
        blocks: [
          {
            kind: "grid",
            items: [
              {
                src: "/projects/posterfolio/poster-01.webp",
                alt: "Poster 1 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-02.webp",
                alt: "Poster 2 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-03.webp",
                alt: "Poster 3 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-05.webp",
                alt: "Poster 5 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-06.webp",
                alt: "Poster 6 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-07.webp",
                alt: "Poster 7 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-09.webp",
                alt: "Poster 9 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-10.webp",
                alt: "Poster 10 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-11.webp",
                alt: "Poster 11 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-12.webp",
                alt: "Poster 12 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-13.webp",
                alt: "Poster 13 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-14.webp",
                alt: "Poster 14 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-15.webp",
                alt: "Poster 15 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-16.webp",
                alt: "Poster 16 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-17.webp",
                alt: "Poster 17 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-18.webp",
                alt: "Poster 18 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-20.webp",
                alt: "Poster 20 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-21.webp",
                alt: "Poster 21 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-22.webp",
                alt: "Poster 22 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-24.webp",
                alt: "Poster 24 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-25.webp",
                alt: "Poster 25 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-26.webp",
                alt: "Poster 26 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-27.webp",
                alt: "Poster 27 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-28.webp",
                alt: "Poster 28 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-29.webp",
                alt: "Poster 29 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-30.webp",
                alt: "Poster 30 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-33.webp",
                alt: "Poster 33 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-34.webp",
                alt: "Poster 34 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-35.webp",
                alt: "Poster 35 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-36.webp",
                alt: "Poster 36 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-37.webp",
                alt: "Poster 37 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-38.webp",
                alt: "Poster 38 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-39.webp",
                alt: "Poster 39 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-40.webp",
                alt: "Poster 40 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-41.webp",
                alt: "Poster 41 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-04.webp",
                alt: "Poster 4 from the Posterfolio series.",
                newRow: true,
              },
              {
                src: "/projects/posterfolio/poster-08.webp",
                alt: "Poster 8 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-19.webp",
                alt: "Poster 19 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-23.webp",
                alt: "Poster 23 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-31.webp",
                alt: "Poster 31 from the Posterfolio series.",
              },
              {
                src: "/projects/posterfolio/poster-32.webp",
                alt: "Poster 32 from the Posterfolio series.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "gravitas",
    /* a shipped site and a full deep dive, so it belongs in both lists */
    alsoCaseStudy: true,
    title: "Gravitas",
    logoText: "GRAVITAS·25",
    logoUrl: "/projects/gravitas-logo.webp",
    category: "Website + Branding",
    year: "2025",
    cover: "/projects/gravitas/cover.webp",
    preview: {
      kind: "website",
      image: "/projects/gravitas/cover.webp",
      href: "https://gravitas25-frontend.vercel.app/",
    },
    cta: "Visit Live Website",
    /*
      The fest's own mint, sampled from the hero buttons in the shipped UI.
      13:1 on the dark canvas but 1.5:1 on white, so light-mode TEXT drops to
      a deep teal of the same hue while `solid` keeps a mid value that still
      reads as a border or ring in both themes (7.11:1 dark, 2.45:1 light,
      the same trade the other dark-brand projects here make).

      `bright` runs the cursor, its tag and the pins, which are meant to be
      spotted rather than read through. White on mint is 1.5:1, so `ink` puts
      a near-black on it instead, at 10.92:1.
    */
    accent: {
      dark: "#7FE3D4",
      light: "#0E7466",
      solid: "#2BB9A4",
      bright: "#96F0E6",
      ink: "#06231E",
      fill: "#7FE3D4",
      fillInk: "#06231E",
    },
    role: "Website Design",
    tools: ["Figma", "Illustrator"],
    description:
      "Gravitas is VIT Vellore's flagship techno-management fest, and the website is where thousands of students find and register for hundreds of workshops and competitions. The old one had grown into a wall of text. This is a rebuild around a retro-tech system that makes a catalogue that size searchable, and turns browsing into booking.",
    extraFacts: [
      ["Event", "Gravitas'25, VIT Vellore"],
      ["Live at", "gravitas25-frontend.vercel.app"],
      ["Scope", "Website design, event catalogue, authentication, profile"],
      ["Catalogue", "200+ events across three days"],
      ["Team", "With the Gravitas'25 Design and Print team"],
    ],
    highlights: [
      "Retro-tech system built to carry hundreds of events without a wall of text",
      "Role-based entry that filters the experience the moment you sign in",
      "Filtering and a wishlist that turn browsing into registration",
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
                body: "The central hub for **VIT's biggest technical fest**: a rebuild of the Gravitas site that turns a **200+ event** catalogue into something a student can actually search, shortlist and register through.",
              },
              {
                label: "The problem",
                body: "The old site had scaled into **content saturation**. Everyone saw the same wall of text, with no way to narrow it down.",
              },
              {
                label: "The approach",
                body: "A **retro-tech system** with real hierarchy, plus filters, modals and a wishlist so the catalogue can be worked through rather than read.",
              },
              {
                label: "Key moves",
                body: "**Ask who you are before what you want.** Filter by category, price and team size. Put the **wishlist** ahead of the receipt.",
              },
              {
                label: "Outcome",
                body: "**2M+ visits**, **77k+ new users** and **40,000+ event registrations** across the fest.",
              },
              {
                label: "Team",
                body: "Designed with the **Gravitas'25 Design and Print team**.",
              },
            ],
          },
        ],
      },
      {
        name: "challenge",
        heading: "High traffic, low commitment",
        blocks: [
          {
            kind: "prose",
            body: [
              "A fest catalogue grows every year, and the site had not grown with it. Hundreds of events were presented as one undifferentiated list, so the page carried everything and pointed at nothing. The traffic was never the problem. **People arrived, browsed and left without registering.**",
            ],
          },
          {
            kind: "numbered",
            items: [
              {
                label: "One page for everybody",
                body: "No personalised entry point. A first-year looking for a workshop and an external startup saw the **identical wall of text**.",
              },
              {
                label: "Navigation that only reacted",
                body: "Nothing helped you **narrow the catalogue down**. Finding the right event meant scrolling until you happened to see it.",
              },
              {
                label: "Gaps that ended the visit",
                body: "**404s and loading screens were dead ends**, with nothing to carry a user back into the fest.",
              },
              {
                label: "Nowhere to put a maybe",
                body: "An event you were interested in but not ready to pay for had **no place to go**, so coming back meant starting the search again.",
              },
            ],
          },
          {
            kind: "statement",
            text: "Users were **browsing, not committing**. The catalogue was all there. It just could not be worked through.",
          },
        ],
      },
      {
        name: "approach",
        heading: "From information board to system",
        blocks: [
          {
            kind: "prose",
            body: [
              "The rebuild treats the site as a **system that responds to who is using it** rather than a board that displays everything to everyone. The retro-tech direction does real work here: a hard grid, pixel display type and high-contrast panels give a dense catalogue **visible structure**, so scale reads as organisation instead of noise.",
            ],
          },
          {
            kind: "compare",
            lanes: [
              {
                label: "Before",
                tone: "before",
                note: "Everything present, nothing prioritised.",
                steps: [
                  "One generic list for every visitor",
                  "Scroll until you find it",
                  "No way to save an event for later",
                  "Errors and empty states end the visit",
                  "Register now or lose your place",
                ],
              },
              {
                label: "After",
                tone: "after",
                note: "The same catalogue, made workable.",
                steps: [
                  "The experience narrows to your role at sign-in",
                  "Filter by category, price and team size",
                  "Wishlist anything you are not ready to book",
                  "Every state routes back into the fest",
                ],
              },
            ],
            caption:
              "Nothing was removed from the catalogue. What changed is that a visitor can now **cut it down to the handful of events that apply to them**.",
          },
        ],
      },
      {
        name: "homepage",
        heading: "The homepage",
        blocks: [
          {
            kind: "figure",
            shot: {
              src: "/projects/gravitas/home-hero.webp",
              alt: "The Gravitas'25 homepage on a laptop, with the pixel wordmark, the fest dates and Events and Merch buttons over a dark tiled background.",
              caption: "The homepage, holding itself to two destinations.",
              wide: true,
            },
          },
          {
            kind: "prose",
            body: [
              "The hero carries the **wordmark, the dates and two buttons**, and stops there. A fest homepage is under pressure to announce everything at once, which is how the old one filled up. Holding it to **Events and Merch** means the page has a job rather than a job list, and the marquee underneath gives the fest its noise without taking space from the decision.",
            ],
          },
        ],
      },
      {
        name: "authentication",
        heading: "Segmented authentication",
        blocks: [
          {
            kind: "prose",
            body: [
              "The standard move is an email and password box. This asks a different first question: **who are you here as?**",
            ],
          },
          {
            kind: "step",
            items: [
              {
                src: "/projects/gravitas/auth-affiliation.webp",
                label: "01 Affiliation",
                alt: "The Gravitas sign-in screen asking the user to select their affiliation, with VIT Vellore Student and External Participants options beside a retro-tech control panel illustration.",
              },
              {
                src: "/projects/gravitas/auth-details.webp",
                label: "02 Only the fields that apply",
                alt: "The Gravitas details form asking for phone number, organisation name, designation and an optional LinkedIn profile.",
              },
            ],
            body: [
              "Picking **VIT student or external participant** first means the form that follows only asks what that person can answer. A student never sees organisation and designation fields, and an external participant is never asked for a registration number they do not have. **The branch costs one tap and removes every irrelevant field after it**, which is cheaper than one long form that makes everybody skip past half of it.",
              "It also sets up everything downstream. Once the system knows the affiliation, the catalogue, the pricing and the eligible events can differ **without the user filtering for any of it**.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/gravitas/auth-affiliation-use.webp",
              alt: "A person sitting outdoors using the Gravitas affiliation screen on a laptop.",
              caption:
                "The affiliation choice is the first thing a new visitor meets.",
            },
          },
        ],
      },
      {
        name: "events",
        heading: "Advanced event discovery",
        blocks: [
          {
            kind: "step",
            items: [
              {
                src: "/projects/gravitas/events-filters.webp",
                label: "01 The filter rail",
                alt: "The Gravitas events page with a left filter rail for event type, price range and date, beside a searchable list of events.",
              },
              {
                src: "/projects/gravitas/events-desk.webp",
                label: "02 The catalogue",
                alt: "The Gravitas events page shown on a laptop, with filters applied and event cards listing time, date and team size.",
              },
            ],
            body: [
              "Filters sit in a **persistent left rail** rather than behind a button, because a catalogue this size is used by narrowing repeatedly, and a filter you have to reopen each time gets used once. **Category, price and team size** are the three questions a student actually arrives with, so they are the three that get controls.",
              "Every card carries **time, date, team size and price on its face**. Those are the details that decide whether an event is even possible for you, and putting them behind a click turns a shortlist into a tab-opening exercise. **Only show available events** is on by default, since a full event you cannot join is just another row to read past.",
            ],
          },
          {
            kind: "figure",
            shot: {
              src: "/projects/gravitas/events-cushion.webp",
              alt: "The Gravitas events page with its filter rail, shown on a laptop against a teal background.",
              caption: "The filter rail stays put while the catalogue narrows.",
              wide: true,
            },
          },
        ],
      },
      {
        name: "wishlist",
        heading: "The wishlist",
        blocks: [
          {
            kind: "step",
            items: [
              {
                src: "/projects/gravitas/profile-wishlist.webp",
                label: "01 Wishlist first",
                alt: "The Gravitas profile page with the Wishlist tab active, showing saved events ahead of the purchased merch and purchased events tabs.",
              },
              {
                src: "/projects/gravitas/profile-hands.webp",
                label: "02 The profile in use",
                alt: "The Gravitas profile and wishlist page shown on a laptop held in two hands.",
              },
            ],
            body: [
              "The profile used to be a receipt list. Here the **wishlist is the first tab**, ahead of purchased merch and purchased events, because a profile organised around what you already bought is a record, and one organised around **what you meant to do next** is a way back in.",
              "It also matches how these decisions actually get made. Students shortlist events, check them against friends and a timetable, then book. Without somewhere to hold a maybe, **that gap between interest and registration is where the visit ended**.",
            ],
          },
        ],
      },
      {
        name: "results",
        heading: "What it did",
        blocks: [
          {
            kind: "results",
            items: [
              {
                value: "2M+",
                label: "site traffic",
                note: "Across the fest cycle.",
              },
              { value: "2M+", label: "landing page views" },
              { value: "77k+", label: "new users acquired" },
              {
                value: "40,000+",
                label: "event registrations",
                note: "The number the rebuild was actually aimed at.",
              },
              { value: "200+", label: "events managed through the platform" },
            ],
          },
          {
            kind: "prose",
            body: [
              "Designed in collaboration with the **Gravitas'25 Design and Print team**.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "meal-maestro",
    challenge: [
      "Meal planning fails in the same place every time, and it is not the cooking. Working professionals aged 28 to 45 said it plainly: “I plan on Sunday and I’ve quit by Wednesday”, and “by the time I’m home, I’ve got no decisions left in me.”",
      "Twelve interviews and 140 survey responses pointed at the same cause. People do not lack motivation, they lack **time and cognitive space**, and the apps they had already tried were widening the gap rather than closing it: “every app gives me recipes, none give me a plan.”",
    ],
    solution: [
      "**Automation over education.** The app does the planning instead of teaching someone to plan. It takes what you like, what you avoid and what is already in your kitchen, and returns a week of recipes with the one grocery list that covers them.",
      "Planning and groceries stay a single flow, because the research was blunt that disconnected tools create friction people refuse to tolerate. **Personalisation is the retention mechanism**, not a settings screen: generic recommendations were dismissed immediately. A tracker keeps progress visible, so a good week reads as one.",
    ],
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
      ["Recognition", "3rd: GDG Design-a-thon"],
      ["Research", "12 interviews · 140 survey responses · 5 weeks"],
    ],
    highlights: [
      "Grounded in primary research: 12 discovery interviews, 140 survey responses and 4 comparison teardowns",
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
          (_, i) =>
            `/projects/meal-maestro/s${String(i).padStart(2, "0")}.webp`,
        ),
        sliceW: 1400,
        sliceH: 1240,
        lastSliceH: 1226,
        wide: true,
        caption:
          "The full case study: research with real users, the insights it earned, the design system, and the flows it produced.",
        alt: "The Meal Maestro case study: a smart meal-planning app for personalised recommendations and nutrition guidance. It runs from the goal of making healthy eating simpler, through branding and primary research grounded in real voices and real data (12 discovery interviews, 140 survey responses, 4 comparison teardowns, 5 weeks), into key insights about why people abandon meal planning, then a design system of colour and type: Poppins for display and headings, Open Sans for body: and finally the home, recipe detail, tracker and explore flows.",
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
  (p) => p.theme === "dark",
).map((p) => p.id);

export const SELECTED_PROJECTS: Project[] = SELECTED_IDS.map((id) => {
  const project = PROJECTS.find((p) => p.id === id);
  /* Throwing here fails the build rather than shipping a reel with a hole in
     it — every page that renders this is prerendered, so a renamed id is
     caught at build time and never reaches anyone. */
  if (!project) {
    throw new Error(
      `SELECTED_IDS names "${id}", which is not a project in PROJECTS.`,
    );
  }
  return project;
});
