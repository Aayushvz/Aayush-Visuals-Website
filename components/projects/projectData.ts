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
  /*
    A whole page, top to bottom, rather than a view of one.

    These break every rule the media rows are built on. A full site scroll
    is 0.36 wide-to-tall, and the lone-narrow-image cap in rowShape() -
    which is right for a tall screen, and exists because one 4465px picture
    is several thousand pixels of scrolling - reads that as a portrait and
    holds it to a screenful tall. A screenful tall at 0.36 is a 277px-wide
    website: legible as a shape, and as nothing else.

    So a page marked here leaves the rows entirely and is shown at the full
    width of the column, its own height, uncapped. It was drawn as a page
    and it is read as one: long, and large enough to read.
  */
  fullPage?: true;
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
    The case-study headline, which is a different job from the name.

    `title` has to stay short: it is the label on the works grid, the two
    cards at the foot of every project page, the sitemap and the browser
    tab. A headline has to do what a newspaper headline does - name the
    product, the user problem and the design intent in one line - and
    "CPGRAMS" does none of that. It is the first and often only sentence a
    recruiter reads on LinkedIn or in a portfolio list, so it gets its own
    field rather than stretching the one that has four other jobs.

    Omitted, the page falls back to `title`.
  */
  headline?: string;
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
  /*
    The disciplines the project was, shown as tags at the top of the case
    study. Distinct from `tools`, which is what it was made with - a reader
    scanning for "can this person do brand work" is not asking about Figma.
    Optional: `category` stands in where it is not authored.
  */
  services?: string[];
  /*
    What the part actually WAS, in a sentence, for the Role column at the top
    of the case study.

    `role` above is a job title and stays one - it is the label on the works
    grid and in the page's metadata. This is the three lines of scope beside
    it: what was owned, from where to where. Optional, and deliberately not
    derived from anything: a sentence about responsibility is a claim, and the
    renderer falls back to the bare title rather than inventing one.
  */
  roleNote?: string;
  /*
    The opening paragraph: what the project is, and who it is for.

    `description` cannot do this job any more. It is the works-grid summary
    AND the meta description AND the source the About section reads, and the
    hero used to show its first two sentences - which ran to 434 characters on
    Layover, nine lines of 24px type where the reference sets three. Trimming
    `description` to fit would have cut the search snippet and the grid blurb
    with it.

    Written to one shape, deliberately: NAME is a WHAT for WHOM, then a second
    sentence on what it was designed to do. Roughly 270-340 characters, which
    is the three lines the layout is built around. `**bold**` marks the name
    and the one qualifier worth stopping on.
  */
  lead?: string;
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
    The Gallery beat, chosen rather than left over. When present it replaces
    whatever the picker would have gathered, and the set is shown as a single
    row, sized to fit, in the order written here.
  */
  galleryMedia?: { src: string; alt: string }[];
  /* no Gallery beat at all: the highlights already show everything worth seeing */
  noGallery?: true;
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
  /*
    Show page captures inside a browser window.

    Opt-in, because it is only true of some work. A website's screens were
    designed to sit in a browser and read as flat letterboxes without one -
    Mike Tyson's are 1280x580, so at column width they are 276px of image
    under 300px of nothing much. The chrome gives them the proportion they
    were drawn at and tells the reader what they are looking at.

    Wrong for everything else: a poster is not a web page, a phone screen
    has its own chrome already, and a Figma board is a document.
  */
  /*
    The case-study board, on the page at full length.

    Some of this work was laid out as one long board before it was ever a
    web page - the Behance deliverable, with its own sequence and its own
    spacing - and that board is the artefact. Cutting it into the page's
    own sections would be rearranging somebody's layout to fit a template.

    `pieces` rather than one src, because a board is delivered in parts and
    the parts are the point. WebP forces it on anything over 16383px a side
    - Meal Maestro's is 1400x22306 and Layover's 1600x22434 - but the real
    reason is loading: each piece is lazy, so a reader fetches the section
    they have scrolled to rather than twenty-two thousand pixels of case
    study to read the first screen of it. Where the cut can follow the
    board's own sections it does, so nobody ever waits on the bottom half
    of a sentence. A board that fits in one file is a one-element array.

    It goes on the canvas rather than in a scroll box. A box with its own
    scrollbar reads as a modal - a thing to open, not a thing to read - and
    a board that is the case study should not need opening. So it is the
    width of the column and as long as it is, which for Futurepreneurs is
    eight thousand pixels.

    It also replaces the gallery. Everything a gallery would show is
    already in here, in an order somebody chose; showing both is the same
    pictures twice with the second pass in an order nobody chose.
  */
  caseBoard?: { pieces: string[]; alt: string; caption?: string };
  /*
    A poster volume, laid out as the page it was designed as.

    Not a board and not a written case study: a red masthead, then one
    numbered entry per poster carrying its own writing and its own plates.
    The writing lives here as text rather than inside an image, which is
    the point - set as HTML it reflows and stays readable on a phone, where
    the same words baked into a plate arrive at four pixels tall.
  */
  posterVolume?: {
    kicker: string;
    label: string;
    number: string;
    entries: {
      no: string;
      title: string;
      body: string[];
      /** the poster artworks themselves, shown in a grid */
      posters: { src: string; alt: string }[];
      /** the same posters photographed in situ, shown full-bleed */
      plates: { src: string; alt: string }[];
    }[];
  };
  /*
    The board stands in for the case study rather than joining it.

    Layover's covers the same ground as the page's own eight sections, in
    its own order and at its own pace, so running both is the argument made
    twice with the reader left to work out that they are the same argument.
    Everything between the opening statement and More Work gives way to it.
  */
  caseBoardOnly?: true;
  caseFrame?: "browser";
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
    lead:
      "**Mike Tyson Invitational** is a first-year amateur boxing event in **Las Vegas**. I designed and built its ten-page site for four audiences at once, ticket buyers, fighters, sponsors and donors, and made a first edition look like it had been running for years.",
    services: ["Website design", "Visual branding"],
    headline:
      "Ten pages, four audiences, and two moods that hate each other: the first Mike Tyson Invitational",
    challenge: [
      "Two moods that hate each other, and four audiences on one homepage.",
      "The concept was **Iron Forge meets modern tech**. Forge wants texture, heat and grit; tech wants cold, flat and exact. Turn both up and you get a mess with a fire filter over it.",
      "Then a spectator, an amateur fighter, a sponsor and a donor all land on the same page, each wanting a different site. And this was edition one, with no last year to borrow credibility from.",
    ],
    solution: [
      "**I rationed one side instead of blending both**: 65% near black, 25% smelting orange, never more than 10% cold teal. Once the split was a number, I could check a screen against it instead of arguing about it.",
      "Texture lives only in artwork and headline fills. Buttons, forms and body copy stay flat, so the heat sits on a technical surface rather than as a filter over the page.",
      "A sitemap gives each audience its own route off the homepage: tickets, registration, sponsorship and donations each land somewhere built for that one job.",
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
      Every case study is light now, and there is no per-page theme left to
      opt out with: the site's light/dark switch and the data that drove it
      were both removed.
    */
    preview: {
      kind: "website",
      href: "https://mike-tyson-invitational-3821139c156afc7.webflow.io/",
      image: "/projects/mike-tyson-poster.webp",
    },
    cta: "Visit Live Website",
    role: "Designer & Developer",
    roleNote:
      "I led the design end to end: the Iron Forge direction, the design system and all ten pages, built in Webflow, working with engineering, marketing and brand to a fixed launch date.",
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
      "The first Mike Tyson Invitational had a date, a venue in Las Vegas and a name everyone in boxing recognises, and nowhere to send anybody. Ten pages had to sell a ticket, sign up a fighter, court a sponsor and take a donation, without ever once looking like a student project.",
    highlights: [
      "Countdown-driven landing built around a hard launch deadline",
      "Custom Webflow interactions tuned for mobile performance",
      "Ticketing flow simplified into a single frictionless path",
    ],
    extraFacts: [
      ["Surfaces", "10 pages"],
      ["Typefaces", "Legend, Chakra Petch, IBM Plex Sans"],
    ],

    /*
      Ten pages, and the page was showing two of them.

      The default of four named screens is right for work whose argument is
      three or four decisions. This project's argument is the opposite: its
      own headline is "ten pages, four audiences", the sitemap block counts
      the surfaces out, and every one of them was written up with a heading,
      a paragraph and a recording. At four, Tickets, Get Involved, Fighter
      Registration and Donations never reached the page at all - not trimmed
      to a screenshot, absent, headings and prose included. Eighteen is the
      count its own sections add up to.
    */
    caseFrame: "browser",
    /*
      The front door leads, and the ticket does not belong here at all.

      Left to the picker this column opened on the About page and closed on
      a piece of physical ticket artwork - so the first thing beside "the
      challenge" was an interior page, and the last was not a web page. The
      homepage hero is what the argument above is about: a date, a venue and
      a name nobody in boxing recognises, answered in the first screen.
    */
    detailMedia: [
      {
        src: "/projects/mike-tyson/home-hero.webp",
        alt: "Homepage hero with the headline in smelting red over a portrait lit with flame",
      },
      {
        src: "/projects/mike-tyson/about-page.webp",
        alt: "The Evolution hero on the About page, a portrait lit from behind in red and orange",
      },
      {
        src: "/projects/mike-tyson/vision.webp",
        alt: "The Vision Behind The Invitational section in orange and cream over deep red",
      },
      {
        src: "/projects/mike-tyson/event-dates.webp",
        alt: "Three date cards for March 12, 13 and 14 with sale status labels",
      },
    ],
    caseLimits: { highlights: 6, images: 40 },
    noGallery: true,
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
          {
            kind: "statement",
            text: "The work was never about layout, it was about holding heat and precision in one place without either going quiet.",
          },
          /* Written for the About beat: the two paragraphs that sit under the
             statement band and say what that one line assumes. */
          {
            kind: "prose",
            body: [
              "Tyson's name on a poster does most of the selling. It also sets a bar: anything carrying it has to look like fight night in Las Vegas, not a campus event with a famous guest.",
              "Ten pages had to sell tickets, register fighters, court sponsors and take donations, and four of them hand off to software someone else owns.",
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
              "I made four boards to find how far the forge could go before it stopped looking like a sport and started looking like a filter.",
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
        heading: "One palette, rationed",
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
              { name: "Smelting Red", hex: "#F72C25", use: "Primary actions, active states" },
              { name: "Onyx Black", hex: "#060708", use: "Canvas, nav, footer" },
              { name: "Parchment", hex: "#F5F1EA", use: "Body text, outlines" },
              { name: "Heated Steel", hex: "#FF8D3C", use: "Highlights, glow" },
              { name: "Cold Steel", hex: "#3D6D67", use: "Numerals and data, capped at 10%" },
            ],
            caption:
              "**65 / 25 / 10.** Near black and parchment carry most of the site, the red and orange ramp does the accents, and cold teal never passes a tenth.",
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
                title: "One homepage, four audiences",
                body: "A spectator, a fighter, a sponsor and a donor land on the same page. I built it as a descent: heat at the top to sell the night, information in the middle, and four clear exits at the bottom so nobody hunts for their route.",
                alt: "Screen recording scrolling the homepage from hero to footer",
              },
            ],
          },
          {
            kind: "step",
            title: "Tech as a behaviour, not a colour",
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
              "The hero is the whole thesis: near black, a headline in smelting red, one ember of heat on the right. I kept the tech half out of the palette and put it into the interaction instead, so the cursor is a glowing crosshair.",
              "The date reveal is where the two meet: brushed metal for the forge, corner brackets for the HUD. It is the frame I am happiest with.",
            ],
          },
          {
            kind: "step",
            title: "Teal only where the copy is about technology",
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
              "Cold teal runs in one place: the section on AI broadcast and real-time power measurement. Keeping it there means the palette itself tells you the subject changed.",
              "The navigation became a full-screen portal because Buy Tickets and Registration have no natural ranking, and a horizontal bar would have had to invent one.",
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
                body: "A montage of famous knockouts is someone else's story, and it does not explain why an amateur invitational exists. The page runs on one line instead: legacy did not end in the ring, it continued through transformation.",
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
                title: "Sale status before the handoff",
                body: "Ticketing belongs to TicketTailor, so my job ended at the handoff. I put each night's sale status on the page before the jump, so nobody reaches an external checkout to find their night is not on sale yet.",
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
                title: "The most restrained page is the pitch",
                body: "Every other page talks to someone who wants to watch a fight. This one talks to someone with a marketing budget, so I traded the atmosphere for structure and numbers.",
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
                body: "Writing 65 / 25 / 10 beside the palettes did more than any single colour choice. Once one direction was rationed the two stopped clashing, and a written number let me tell a screen was wrong instead of just feeling it.",
              },
              {
                title: "Scope integrations before designing around them",
                body: "The pages that went smoothly were the ones where I knew the checkout belonged to someone else. The ones that hurt were where I had already drawn one.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "elevation-capital",
    lead:
      "**Elevation Capital** published research on how Indian startups use AI, as a PDF almost nobody finishes. I rebuilt it as a site where the numbers are the interface, for the **founders and investors** reading on a phone between meetings.",
    services: ["Website development", "Interaction design"],
    headline:
      "Turning a PDF nobody finishes into a report you scroll",
    challenge: [
      "Research worth reading, shipped in the format nobody finishes.",
      "**86% of founders** plan to increase AI spending and **85% of engineering teams** already run AI in production. Buried in a forty-page document, none of that lands.",
    ],
    solution: [
      "**I rebuilt the report as a site where each finding gets its own moment on screen**, so the reader reaches the conclusion by moving through it rather than skimming past it.",
      "I built it natively in Framer, with live data visualisations and motion that stay readable on a phone, and set it up so the team can publish updates themselves. The research stays live instead of going stale two months after launch.",
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
    role: "Design Engineer",
    roleNote:
      "Design engineer: I designed and built the site natively in Framer, including the data visualisations and motion.",
    tools: ["Framer", "Figma", "AI"],
    description:
      "Elevation Capital had genuinely useful findings about how Indian startups are using AI, and a PDF almost nobody was going to finish. The report was rebuilt as a site where the numbers are the interface, so the research gets read instead of downloaded.",
    highlights: [
      "Interactive report detailing AI adoption across 86% of Indian startup founders",
      "Developed natively on Framer with dynamic data visualizations and smooth motion",
      "Highlighting engineering teams moving AI into production and driving productivity",
    ],
    /* The About beat, written rather than assembled: the one line the page
       opens on, and the two paragraphs underneath it. */
    sections: [
      {
        name: "overview",
        blocks: [
          {
            kind: "statement",
            text: "Research does not travel as a document, it travels as something you can move through.",
          },
          {
            kind: "prose",
            body: [
              "A fund publishes research to be quoted, and a PDF assumes a desk and a free hour that the people doing the quoting never have.",
              "So I treated the findings as the product rather than the contents of one. Nothing is a chart dropped into a page; the page is the chart, and the argument is what you scroll through.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "riviera",
    lead:
      "**Riviera** is VIT Vellore's week-long festival and one of the country's largest student fests. I led the design of its website, which had to make the scale of a whole week land and still let one student find the one event they came for.",
    services: ["Website design", "Visual branding"],
    headline:
      "Carrying a week-long fest without letting the homepage become a directory",
    challenge: [
      "Dozens of events under one name, and two readers who want opposite things.",
      "Put every event and sub-brand on the homepage and it becomes a directory. Hide them and the fest looks smaller than it is.",
    ],
    solution: [
      "**I split the jobs.** A motion-forward homepage carries the energy and signals the scale, so the first impression is the event itself rather than a list of its parts.",
      "Underneath, a content architecture built to hold dozens of events and sub-brands, so the depth is there the moment someone goes looking and the front page never has to carry it all at once.",
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
    role: "Web Designer",
    roleNote:
      "Design Manager for Riviera: I led a 100+ person team across UI/UX, brand and web, and shipped the festival platform UI.",
    tools: ["Framer", "Figma", "Motion"],
    description:
      "Riviera is one of the largest student fests in the country, and its website has to do two things that pull against each other. It has to make the scale of a whole week land, and still let one student find the one event they actually came for.",
    highlights: [
      "Website built to carry one of the country's largest student fests",
      "Motion-forward homepage designed to signal scale and energy",
      "Content architecture built for dozens of events and sub-brands",
    ],
    sections: [
      {
        name: "overview",
        blocks: [
          {
            kind: "statement",
            text: "The homepage sells the week, and everything underneath it helps one student find one event.",
          },
          {
            kind: "prose",
            body: [
              "Most students opening the Riviera site are not browsing. They heard one event named once, and they want to know when it is, what it costs and where to sign up.",
              "Everybody else is doing the exact opposite. They know the name, they have no idea what is inside it, and the first screen is the only chance to make a week look worth clearing a calendar for.",
            ],
          },
        ],
      },
      {
        name: "outcome",
        blocks: [
          {
            kind: "results",
            items: [
              { value: "500K+", label: "visits across the festival" },
              { value: "0", label: "critical UX failures" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "fuzion",
    lead:
      "**Fuzion** is a vintage-modern streetwear brand for a wearer who reads classic Americana, 90s hip-hop and old-school workwear as one thing. I built the identity around that contradiction, putting roman and italic inside a single wordmark.",
    services: ["Visual branding", "Graphic design"],
    headline:
      "A wordmark that fuses roman and italic inside one six-letter word, for a brand whose whole premise is old and new at once",
    challenge: [
      "Lean retro and it reads as a throwback. Lean modern and the heritage claim disappears.",
    ],
    solution: [
      "**The fusion is inside the word.** `fuz` stays roman, `ion` turns italic - one typeface, one weight, one word. The premise is stated by the letterforms before a line of copy is read, which is why the mark needs no symbol.",
      "**Two typefaces doing opposite jobs.** Zodiak carries the class and the luxe; Switzer Variable keeps it minimal and current. The contrast between them is the same contrast the wordmark makes, one level up.",
      "**Four values, weighted to earth.** Burnt sienna is the only loud colour in the set, against bright grey, onyx and dusty auburn - so the photography stays effectively monochrome and the colour lands only where it is meant to.",
      "**A line that does real work.** *Wear The Legacy*, with heritage vocabulary running through the ad lines: heavy on heritage, legacy in layers, worn history.",
    ],
    kind: "case-study",
    title: "Fuzion",
    logoText: "fuzion",
    category: "Branding",
    /* nothing in the exports evidences a year - confirm */
    year: "2025",
    cover: "/projects/fuzion-cover.webp",
    preview: {
      kind: "image",
      src: "/projects/fuzion-cover.webp",
    },
    cta: "See the Identity",
    /* the board carries the whole argument, so the page gives Details over
       to it - see caseBoardOnly. The challenge and solution below stay
       authored: nothing renders them while this flag is set, and they come
       straight back if it is ever removed. */
    caseBoardOnly: true,
    role: "Brand Designer",
    tools: ["Figma", "Illustrator"],
    description:
      "Fuzion is a vintage-modern streetwear brand drawing on classic Americana, 90s hip-hop and old-school workwear. The identity puts that contradiction inside the wordmark itself - roman and italic in one word - and carries it out through Zodiak and Switzer, a four-value palette led by burnt sienna, and the line Wear The Legacy.",
    highlights: [
      "A wordmark that fuses roman and italic inside a single six-letter word",
      "Zodiak and Switzer Variable, paired to make the same old-and-new contrast",
      "Applied across tote, stationery, hangtag and two billboards",
    ],
    extraFacts: [
      ["Client", "Fuzion"],
      ["Studio", "Crestic Era"],
      ["Scope", "Visual identity development"],
    ],
    /*
      Burnt sienna is the brand, and it cannot carry the light side: #eb7452
      is 5.68:1 on ink but only 2.52:1 on the cream, well under what real
      text needs. So light-mode text drops to #ad4a2a, a deeper sienna of
      the same hue at 4.76:1, while `solid` and `bright` keep the true brand
      value for borders, rings and anything meant to be spotted rather than
      read through.

      `ink` is near-black rather than the brand's own onyx: onyx on sienna
      is 4.23:1 and misses, #241f1c makes 5.55:1.
    */
    accent: {
      dark: "#eb7452",
      light: "#ad4a2a",
      solid: "#eb7452",
      bright: "#eb7452",
      ink: "#241f1c",
      fill: "#ad4a2a",
      hover: "#9c3f22",
    },
    /*
      Twelve slides, supplied as separate exports - see
      scripts/board-slides.mjs. Mixed .jpg and .jpeg, and mixed sizes: seven
      of the twelve arrived under 2400px and were left at source rather than
      upscaled. The hoodie still (s08) is the outlier at 673px wide and is
      the one piece that will look soft at full bleed.
    */
    /* the About beat, written rather than falling back to the description */
    sections: [
      {
        name: "overview",
        blocks: [
          { kind: "statement", text: "Vintage-modern is a contradiction, so I put it inside the wordmark instead of choosing a side." },
          {
            kind: "prose",
            body: [
              "Roman and italic sit in one word, so the mark itself is old and new at once.",
              "Zodiak and Switzer carry the rest, a four-value palette led by burnt sienna gives it warmth, and the line Wear The Legacy says the idea out loud.",
            ],
          },
        ],
      },
    ],
    caseBoard: {
      pieces: Array.from(
        { length: 12 },
        (_, i) => `/projects/fuzion/board/s${String(i).padStart(2, "0")}.webp`,
      ),
      caption: "The full identity board, in the order it was laid out.",
      alt: "The Fuzion identity board: the cover with the brand history over a street portrait, the wordmark on burnt sienna, a Morden Class spread, the wordmark on grey and on sienna, the four-value palette of bright grey, burnt sienna, onyx and dusty auburn, the Zodiak and Switzer type specimens, the Wear The Legacy tagline with its ad lines, a tote bag, a hoodie still, a street billboard, the stationery set, and a building billboard.",
    },
  },
  {
    id: "cpgrams",
    lead:
      "**CPGRAMS** is how citizens complain to the **Government of India**: twenty lakh grievances a year, 90+ ministries, one fifteen-field form. I designed the chatbot that sits on top of it, so you say what went wrong in any of **22 languages** and it files the grievance for you.",
    services: ["Product design", "Conversational UX"],
    headline:
      "Filing a government grievance by speaking, in any of 22 languages",
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
    role: "Product Designer · Conversational UX",
    roleNote:
      "Product Design Intern at KPMG India (GovTech). I owned the conversational experience end to end: the journeys, voice intake, the review step, the 22-language UI and the Samadhan Didi mascot.",
    tools: ["Figma", "Conversational UX", "Prototyping"],
    description:
      "CPGRAMS is how you complain to the Government of India: twenty lakh grievances a year, more than ninety ministries, and a fifteen-field form that in practice only works if you read English or Hindi. I designed the chatbot that sits on top of it, so you can say what went wrong in whichever of the 22 official languages you actually think in, and it files the grievance for you.",
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
      "The system works. The door does not.",
      "An officer is legally obliged to answer every grievance, and 93% get closed. Reaching one is the hard part: a 15-field form whose second question asks which of **90+ ministries** owns your problem, in English or Hindi only, behind a CAPTCHA and a session that quietly expires. **Six in ten people who start it never finish.**",
      "So the people the system exists for are the least able to reach it. A quarter of the country cannot read or write, and more than 550 million people think in a language the portal does not speak.",
    ],
    solution: [
      "I stopped redesigning the form and designed a **translation layer** over it. Same ministries, same categories, same 30 to 60 day clock. The complexity does not disappear, it moves off the citizen and into software that already knows how government is organised.",
      "**The system works out the ministry instead of asking for it, listens for the language instead of offering a list, and shows you what it understood before anything is filed.** Voice carries all three: press once, talk, and the fifteen fields are pulled out of that one answer.",
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
    caseLimits: { highlights: 6, images: 200, gallery: 30 },
    /* the phone flow, in one row: tutorial, voice from rest to review, and a typed grievance */
    galleryMedia: [
      { src: "/projects/cpgrams/m-demo-4.webp", alt: "The phone tutorial spotlighting the microphone button, with Samadhan Didi reduced to a corner presence so she does not cover it." },
      { src: "/projects/cpgrams/m-voice-1.webp", alt: "CPGRAMS voice flow resting state on a phone." },
      { src: "/projects/cpgrams/m-voice-3.webp", alt: "CPGRAMS voice recording on a phone with a live waveform." },
      { src: "/projects/cpgrams/m-voice-7.webp", alt: "CPGRAMS phone screen with a spoken response player." },
      { src: "/projects/cpgrams/m-voice-9.webp", alt: "CPGRAMS review screen on a phone before submission." },
      { src: "/projects/cpgrams/m-text-3.webp", alt: "A typed grievance on a phone screen." },
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
              "Lodge a grievance against any central department and an officer has to answer within 30 to 60 days. This is what it took to get that far.",
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
            kind: "statement",
            text: "A channel built for **1.4 billion people**, used in practice by the **top 15%**.",
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
              "People were not failing to file grievances, they were failing to **fill in a form**, and only one of those is the citizen's problem. So I stopped designing a better portal and started designing a **translation layer** over the one that already works.",
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
              "Two things were fixed before I started: the government's **taxonomy could not change**, and I could not assume the person filing **could read**. Together they rule out the obvious answer, because a tidier form is still a reading test.",
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
          /*
            No desktop frame of the tutorial at all now.

            It went from five to one and then to none. A first-run sequence
            is the least interesting thing a product does, and what it was
            showing - a dimmed screen with one control lit and a speech
            bubble over it - is a pattern the reader already knows by name.
            The paragraphs below carry the reasoning, and the phone frame
            further down carries the one claim that has to be seen: that at
            402px the guide cannot stand at full height without covering the
            control she is pointing at.
          */
          {
            kind: "prose",
            body: [
              "The tutorial **points at the interface** rather than describing it. Spotlight masking dims everything except the control being explained, and the microphone gets the plainest sentence in the product: press it and speak in your language.",
              "**Skip sits on the first frame**, not the last. Onboarding should not tax the confident user to reassure the uncertain one.",
            ],
          },
          /* the same moment on a phone, kept because the paragraph under it
             makes a claim you have to see to believe: at 402px the guide
             cannot stand at full height without covering the control she is
             pointing at. One frame proves it; four repeat it. */
          {
            kind: "gallery",
            items: [
              {
                src: "/projects/cpgrams/m-demo-4.webp",
                label: "The same moment, on a phone",
                alt: "The phone tutorial spotlighting the microphone button, with Samadhan Didi reduced to a corner presence so she does not cover it.",
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
                title: "A person first, not a form",
                alt: "The CPGRAMS Chatbot title screen on saffron with the departmental masthead and Samadhan Didi greeting with folded hands.",
                body: "The first screen is Samadhan Didi on the state's own saffron. The product has to overwrite whatever happened the last time someone opened a government website, and a face that looks like staff does more for that than any layout could.",
              },
              {
                src: "/projects/cpgrams/voice-03.webp",
                step: "Voice 02",
                title: "No language picker, no category dropdown",
                alt: "The CPGRAMS voice flow recording, with a reactive orb replacing the microphone and the line Detecting Language, Please continue to speak.",
                body: "Both make you decide something before you have said a word. You press one button and talk, and the interface switches to the language it heard. One press starts and stops it, because press-and-hold fails for tremor and arthritis, and the over-60s file more grievances than anyone.",
              },
              {
                src: "/projects/cpgrams/voice-04.webp",
                step: "Voice 03",
                title: "Never a silent wait",
                alt: "The CPGRAMS recording panel open with a placeholder transcript line and an instruction to click the microphone to stop recording.",
                body: "On a connection where failure is normal, a pause reads as failure. So the panel opens the moment recording starts, asks you to keep talking while it detects the language, and says in plain words how to stop.",
              },
              {
                src: "/projects/cpgrams/voice-05.webp",
                step: "Voice 04",
                title: "Catch the mistake while it is cheap",
                alt: "The CPGRAMS voice flow showing a live transcript building underneath the detected language and an elapsed recording time.",
                body: "The transcript builds live, with the detected language above it. A misheard road name costs nothing here and a wrongly routed grievance later, so this is where I put the product's first checkpoint.",
              },
              {
                src: "/projects/cpgrams/voice-06.webp",
                step: "Voice 05",
                title: "Nothing files until you have checked it",
                alt: "The CPGRAMS editable transcript with Samadhan Didi pointing at it and a note saying mistakes can be edited here, beside a submit control.",
                body: "Didi points at the text and says it can be edited, by voice or keyboard, so fixing an error never needs the skill the person arrived without. Letting the AI file silently would have been easier. For a legal complaint with someone's name on it, it would also have been worse.",
              },
              {
                src: "/projects/cpgrams/voice-10.webp",
                step: "Voice 06",
                title: "The whole conversation, in one thread",
                alt: "The full CPGRAMS chat a few messages in: the history rail on the left, the citizen's answer Road name NH 45, and Samadhan Didi's reply with the detected language, an audio player and the Grievance Information card, above the input bar.",
                body: "A few messages in, it is still one thread. The citizen's short answer, Road name NH 45, sits under the question that asked for it, and Didi's reply carries the detected language, its spoken version and the Grievance Information card the system has built so far. Every missing detail is one question and one answer, with the input pinned at the bottom for the next, so nothing ever turns back into a form.",
              },
              {
                src: "/projects/cpgrams/voice-07.webp",
                step: "Voice 07",
                title: "The recording stays in the conversation",
                alt: "The CPGRAMS chat thread with the citizen's voice message and waveform player kept above a card reading Identifying Relevant Ministry.",
                body: "The audio is not thrown away once it has been transcribed. It is the one thing on this page the software cannot have got wrong, so it stays in the thread as a playable message. Underneath, the system names the step it is on rather than showing a bar: identifying the relevant ministry.",
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
              { name: "Saffron", hex: "#FE6700", use: "Every primary action, and the state's own colour" },
              { name: "Deep", hex: "#9F2D00", use: "Pressed states and emphasis" },
              { name: "Warm", hex: "#FFC196", use: "The citizen's own bubbles" },
              { name: "Cream", hex: "#FFFBEF", use: "The chat canvas" },
              { name: "Ink", hex: "#333333", use: "Body copy" },
            ],
            caption:
              "Only one of the five is loud. **Saffron carries every primary action**, which is what lets somebody who cannot read the label still find the button.",
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
/*
            The two Figma component sheets came out here.

            They were contact sheets of the same microphone button repeated
            down a column with its own label under each copy - a screenshot
            of a Figma canvas rather than a drawing of the system, and the
            thing they documented is visible in the flow screens anyway. The
            sentence they carried is not about the pictures, so it stays.
          */
          {
            kind: "prose",
            body: [
              "The component set behind all of it, built as **variants rather than screens**. A conversation has no fixed layout to hand a developer, only states and the rules for moving between them.",
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
              "It is **live at cpgramsaichatbot.com**, running against the real grievance system rather than sitting in a deck as a concept.",
            ],
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
                title: "Voice was not a feature. It was the product.",
                body: "I first designed it as one of two inputs. Removing it on paper left the form again, just friendlier. Once I accepted that a quarter of my users cannot read, every other decision got easier: detect the language, speak every reply, never put a dropdown in the way.",
              },
              {
                title: "Familiar beat clever.",
                body: "I wanted something cleaner than a government portal. What worked was keeping the shape people already recognised, the left rail, the account corner, the input at the bottom, and spending the effort on the one thing that had to change.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cat-operator-assistant",
    lead:
      "**CAT Operator Assistant** is a concept cab tablet for **Caterpillar** excavator operators and their fleet managers, built at a hackathon. It turns data the machine already records into five glanceable screens, so an operator can check pace, safety and machine health without leaving the seat.",
    services: ["Product design", "Dashboard design", "Concept", "Front-end build"],
    headline:
      "A cab tablet that turns excavator data into answers an operator can read at a glance",
    title: "CAT Operator Assistant Dashboard",
    logoText: "CAT OA",
    category: "Product Design",
    year: "2026",
    cover: "/projects/cat-operator-assistant-cover.webp",
    preview: {
      kind: "website",
      href: "https://aayushvz.github.io/cat-operator-assistant/",
      image: "/projects/cat-operator-assistant-cover.webp",
    },
    cta: "Open Live Demo",
    role: "Product Designer · Front-end",
    /* Caterpillar yellow. White does not read on it, so anything filled
       yellow takes near-black ink, and text set in the accent on the light
       page drops to a deep gold that clears 4.5:1 */
    accent: {
      dark: "#FFCD11",
      light: "#8A6800",
      solid: "#FFCD11",
      bright: "#FFCD11",
      ink: "#141414",
      fill: "#FFCD11",
      fillInk: "#141414",
    },
    roleNote:
      "Product design and front end, end to end: the interaction model, every screen, the procedural 3D excavator and the job-time estimator.",
    tools: ["HTML", "CSS", "JavaScript", "Three.js"],
    description:
      "CAT Operator Assistant is a concept cab tablet app for Caterpillar excavator operators. It turns machine telematics and the day's job list into five screens: today's jobs, safety, training, machine health and a live 3D home view, plus a read-only fleet view for managers.",
    extraFacts: [
      ["Type", "Conceptual project for Caterpillar"],
      ["Stack", "Vanilla HTML, CSS and JS, procedural Three.js (r128)"],
      ["3D", "Excavator built in code, no downloaded assets"],
      ["Repo", "github.com/Aayushvz/cat-operator-assistant"],
    ],
    highlights: [
      "Seatbelt interlock: the engine stays locked until the operator is signed in and belted",
      "Live 3D machine health, color-coded part by part",
      "Offline-first incident reports that sync when signal returns",
    ],
    challenge: [
      "An operator makes dozens of decisions an hour with almost nothing to go on.",
      "The day's jobs live in their head, the machine's real condition sits in gauges nobody reads until something breaks, and training happens when a supervisor finds the time. A new operator cannot tell if they are behind, working safely or wearing the machine out.",
      "The fleet manager sees even less. A seatbelt violation or a job running two hours late reaches them after the shift, when the pattern behind it is gone.",
    ],
    solution: [
      "**I designed for the cab first and the office second.** Each screen answers one question an operator asks all shift: am I on pace, is the machine safe, what is next. Status runs on red, amber and green, the most important number is always the largest thing on screen, and every target is sized for a gloved hand.",
      "The fleet view reads the same data model, read-only, across every machine on site. And every number says where it came from: the real telemetry is used as given, and anything simulated is labelled sample data, never passed off as a live sensor.",
    ],
    detailMedia: [
      {
        src: "/projects/cat-operator-assistant/home-fault.webp",
        alt: "The home screen with the boom and hydraulics fault open: leaking boom cylinder, low pump pressure, hot hydraulic oil and a call-the-mechanic instruction.",
      },
      {
        src: "/projects/cat-operator-assistant/tasks-accuracy.webp",
        alt: "How close were the guesses: the flat plan at 13.2% average error against the estimator at 2.4%, with plan and real time for each of the five tasks.",
      },
      {
        src: "/projects/cat-operator-assistant/learn-controls.webp",
        alt: "Learn: a top-down view of the cab with ten numbered controls, the chosen control explained and its CAT videos beside it.",
      },
    ],
    /* one numbered section per feature area, each with its own screens */
    caseChapters: true,
    caseLimits: { highlights: 6, images: 60 },
    sections: [
      {
        name: "overview",
        blocks: [
          {
            kind: "statement",
            text: "Most machine dashboards are built for the office and squeezed into the cab, so I started from the seat and worked outward.",
          },
          {
            kind: "prose",
            body: [
              "I built this at a hackathon as a concept for Caterpillar: a tablet in the cab that turns data the excavator already records into five screens, plus a read-only view for the fleet manager. No new hardware on the machine.",
              "It runs as a static web app in plain HTML, CSS and JavaScript so it loads on a weak site connection, and the excavator is generated in code with Three.js rather than downloaded as a model.",
            ],
          },
          {
            kind: "results",
            items: [
              { value: "2.4%", label: "Average job-time error, trained estimator" },
              { value: "13.2%", label: "Average job-time error, the fixed plan" },
            ],
            caption:
              "Measured on the same five tasks the estimator learned from, and the app says so on screen.",
          },
        ],
      },
      {
        name: "start of shift",
        heading: "Start of shift",
        blocks: [
          {
            kind: "prose",
            body: [
              "I made the sign-in double as a pre-start safety check, so a shift cannot begin in an unsafe state.",
            ],
          },
          {
            kind: "step",
            title: "Skill level sets the day's estimates",
            items: [
              {
                src: "/projects/cat-operator-assistant/signin-who.webp",
                alt: "Start of shift, step one: choose who is driving from three operator cards, with a separate entry for the fleet manager.",
              },
              {
                src: "/projects/cat-operator-assistant/signin-pin.webp",
                alt: "Start of shift, step two: a four-digit PIN on a large keypad, with a badge scan as the alternative.",
              },
            ],
            body: [
              "The operator picks a profile, beginner to expert, and confirms with a PIN or a badge. The level is not decoration: it sets the expected time for every job that day, so the estimates match the person in the seat.",
            ],
          },
          {
            kind: "step",
            title: "The engine stays locked until the belt is on",
            items: [
              {
                src: "/projects/cat-operator-assistant/signin-belt.webp",
                alt: "Start of shift, step three: belt on, start the engine, with an optional walk-around check of mirrors, oil and cameras.",
              },
              {
                src: "/projects/cat-operator-assistant/home-wait.webp",
                alt: "Mid-shift during a wait: the belt has come off, the screen warns to put it back on before starting again, and offers a while-you-wait training video.",
              },
            ],
            body: [
              "A blocked start is logged as a safety event, and the belt is watched all shift. If it comes off during a wait, the screen warns the operator before the machine moves again, so the fleet owner gets a guarantee rather than a policy.",
            ],
          },
        ],
      },
      {
        name: "home",
        heading: "Home",
        blocks: [
          {
            kind: "prose",
            body: [
              "Home is built to be read in a glance between loads.",
            ],
          },
          {
            kind: "step",
            title: "A 3D machine instead of a sensor table",
            items: [
              {
                src: "/projects/cat-operator-assistant/home-telemetry.webp",
                alt: "The operator's home screen: the 3D excavator with its boom flagged red, a boom and hydraulics fault card, the live seatbelt card, today's shift timeline and the telemetry panel.",
              },
            ],
            body: [
              "I drew the excavator live in 3D and coloured it by condition, red for a fault and amber for check soon, with six tappable parts. An operator reads a red boom faster than a fault code.",
              "Pace is measured against the operator's own best time, not anyone else's.",
            ],
          },
        ],
      },
      {
        name: "my tasks",
        heading: "My tasks",
        blocks: [
          {
            kind: "prose",
            body: [
              "Plans change on site, so the job list replans itself.",
            ],
          },
          {
            kind: "step",
            title: "A plan that replans itself",
            items: [
              {
                src: "/projects/cat-operator-assistant/tasks-today.webp",
                alt: "My tasks: now, next and shift-left tiles, a demolition job moved to tomorrow for wind, and the day's job list.",
              },
              {
                src: "/projects/cat-operator-assistant/tasks-jobtime.webp",
                alt: "The job time tab: job type, weather, operator level and machine age in, an expected time range out.",
              },
            ],
            body: [
              "Now, Next and Shift-left sit above the list, with one-tap Mark done and Running late. The plan checks the forecast and moves wind-sensitive work like demolition to another day.",
              "The job-time estimate is a range, shown beside how accurate past estimates were, rather than one confident number an operator learns to ignore.",
            ],
          },
        ],
      },
      {
        name: "safety and reports",
        heading: "Safety and reports",
        blocks: [
          {
            kind: "prose",
            body: [
              "Safety is designed for the worst moment on site, including the one with no signal.",
            ],
          },
          {
            kind: "step",
            title: "One hold for SOS, even offline",
            items: [
              {
                src: "/projects/cat-operator-assistant/safety.webp",
                alt: "Safety: the site warning flag, the proximity radar with logged zone crossings, site conditions and the SOS control.",
              },
              {
                src: "/projects/cat-operator-assistant/sos-sent.webp",
                alt: "SOS sent: the machine stopped, the supervisor told, the site medic on the way, the location sent and the machine data saved.",
              },
            ],
            body: [
              "Holding SOS for 1.5 seconds stops the machine, alerts the supervisor and saves the last 60 seconds of machine data. An incident report takes a hold and two taps.",
              "Proximity zones grow in rain, and every report saves to the tablet with a machine snapshot until signal returns.",
            ],
          },
        ],
      },
      {
        name: "fleet",
        heading: "Fleet view",
        blocks: [
          {
            kind: "prose",
            body: [
              "The manager's view reads the same data the cab tablets send, read-only.",
            ],
          },
          {
            kind: "step",
            title: "Who needs attention today",
            items: [
              {
                src: "/projects/cat-operator-assistant/fleet-a.webp",
                alt: "Fleet view: filters, machines working, open reports, a review list of habit changes and waiting time per operator.",
              },
              {
                src: "/projects/cat-operator-assistant/fleet-b.webp",
                alt: "Fleet view, continued: reports per day, fuel per load per machine, plan versus real job time and the full log.",
              },
            ],
            body: [
              "Managers filter by operator, machine and date, and a review list flags each operator's habit changes with one-tap Talk to operator or Dismiss. Habits are measured against that operator's own baseline, so the conversation is about their week, not a leaderboard.",
            ],
          },
        ],
      },
      {
        name: "learn",
        heading: "Learn",
        blocks: [
          {
            kind: "prose",
            body: [
              "Training based on each operator's own shifts, not one module for everyone.",
            ],
          },
          {
            kind: "step",
            title: "Controls and videos, picked for this operator",
            items: [
              {
                src: "/projects/cat-operator-assistant/learn-videos-a.webp",
                alt: "Learn videos: the operator's license progress and the videos to watch first, picked from their own shifts.",
              },
              {
                src: "/projects/cat-operator-assistant/learn-videos-b.webp",
                alt: "Learn videos, continued: the CAT video library, a senior operator to learn from and a practice exercise.",
              },
            ],
            body: [
              "A top-down cab diagram numbers ten controls, including the emergency stop and horn, each linked to an official CAT training video. Seven videos are ranked by what this operator's recent shifts show they struggle with, such as long waits or starting without a belt.",
              "The fleet owner spends less on general training, and operators fix their specific gaps faster.",
            ],
          },
          {
            kind: "step",
            title: "Habits against their own baseline",
            items: [
              {
                src: "/projects/cat-operator-assistant/learn-habits-a.webp",
                alt: "Your habits: waiting time, fuel per load, belt-offs and time per load against the operator's own usual numbers.",
              },
              {
                src: "/projects/cat-operator-assistant/learn-habits-b.webp",
                alt: "Your habits, in detail: fuel per load, time spent waiting, each load step by step and engine hours per load.",
              },
            ],
            body: [
              "Five-shift trend lines track waiting time, fuel per load and seatbelt removals. Each one is compared with the operator's own usual numbers, not with other people.",
            ],
          },
        ],
      },
      {
        name: "machine",
        heading: "Machine",
        blocks: [
          {
            kind: "prose",
            body: [
              "Condition monitoring that flags problems before they become breakdowns.",
            ],
          },
          {
            kind: "step",
            title: "Part-by-part health scores",
            items: [
              {
                src: "/projects/cat-operator-assistant/machine-health.webp",
                alt: "Machine health: the 3D excavator colored by condition, with fix now, check soon and fine groups and a call-the-mechanic button.",
              },
              {
                src: "/projects/cat-operator-assistant/machine-parts.webp",
                alt: "Part by part: a health score gauge for each part, reading charts over ten shifts against their limits, and the next service in 70 hours.",
              },
            ],
            body: [
              "Every issue is sorted into Fix now, Check soon or Fine, with a one-tap Call the mechanic for the most urgent fault and a countdown to the next service in engine hours.",
              "Boom, tracks, bucket, engine, cooling and cab each get a 0 to 100 health score and two sensor charts over the last ten shifts, drawn against a normal range and a limit line. A repair call becomes a decision backed by data.",
            ],
          },
        ],
      },
      {
        name: "platform",
        heading: "Across every screen",
        blocks: [
          {
            kind: "prose",
            body: [
              "The details that make it usable in a real cab, on every screen.",
            ],
          },
          {
            kind: "step",
            title: "Built around one operator",
            items: [
              {
                src: "/projects/cat-operator-assistant/profile.webp",
                alt: "Profile: the operator's jobs, belt-on record, license progress, warning points, licenses and training.",
              },
              {
                src: "/projects/cat-operator-assistant/settings.webp",
                alt: "Settings: language, spoken warnings, screen mode, warning volume and sign-in options.",
              },
            ],
            body: [
              "Profile shows the operator's license progress and warning points. Settings controls language, spoken warnings, screen mode and warning volume for that cab only.",
            ],
          },
          {
            kind: "step",
            title: "Night mode, a driving lock and no signal",
            items: [
              {
                src: "/projects/cat-operator-assistant/night-mode.webp",
                alt: "Night mode: the home screen in a layered dark palette, with the engine off and the shift paused for lunch.",
              },
              {
                src: "/projects/cat-operator-assistant/moving-lock.webp",
                alt: "The moving lock: the screen dimmed to a compact strip with the current job, minutes left, belt state, Report and SOS.",
              },
            ],
            body: [
              "Night mode uses a layered dark palette instead of inverted colors, to cut glare in a dark cab. While the machine moves, every screen locks to a simple strip with the current job, belt status, Report and SOS, so the operator's eyes stay on the site.",
              "The interface switches between English and Hindi, and touch targets are sized for gloved hands. Everything is offline-first: it saves to the tablet and syncs when signal returns.",
            ],
          },
        ],
      },
      {
        name: "hard parts",
        heading: "What was hard to build",
        blocks: [
          {
            kind: "prose",
            body: ["Four problems took most of the build time."],
          },
          {
            kind: "step",
            title: "A 3D machine with no model file",
            items: [],
            body: [
              "There was no model to download, so the excavator is generated in code. Each part is tagged separately, so a boom fault or worn track can turn just that part red or amber in real time.",
            ],
          },
          {
            kind: "step",
            title: "An estimator that is honest about itself",
            items: [],
            body: [
              "The estimator had to beat a fixed plan fairly. Its 2.4% error was measured on the same five tasks it learned from, and the app says so instead of hiding it.",
            ],
          },
          {
            kind: "step",
            title: "Designed for the cab, not for a demo",
            items: [],
            body: [
              "Every screen had to feel like something a gloved operator would really tap on site. The first drafts looked like a generic AI dashboard with tinted cards, so they were thrown out.",
            ],
          },
          {
            kind: "step",
            title: "Safety with no signal",
            items: [],
            body: [
              "Reports save to the tablet first and sync later. The seatbelt interlock has to match the engine lock state at the exact moment a report is filed.",
            ],
          },
        ],
      },
      {
        name: "next",
        heading: "What's next",
        blocks: [
          {
            kind: "prose",
            body: [
              "Where it could go next. Ideas, not a committed roadmap.",
            ],
          },
          {
            kind: "step",
            title: "Works fully offline",
            items: [],
            body: [
              "Make it an installable app (a PWA) that stores the whole shift screen on the tablet, so it works from a cold start with zero signal.",
            ],
          },
          {
            kind: "step",
            title: "Real motion detection",
            items: [],
            body: [
              "Replace the demo Parked and Moving switch with the tablet's own motion sensors, so the lock responds to a machine that is really moving.",
            ],
          },
          {
            kind: "step",
            title: "Live fleet updates",
            items: [],
            body: [
              "Push updates to the fleet view in real time instead of refreshing on a timer, so a manager sees a belt come off the moment it happens.",
            ],
          },
          {
            kind: "step",
            title: "Voice-first reports",
            items: [],
            body: [
              "An operator mid-task has gloves on and a joystick in each hand. Saying \"Hey CAT, report a near miss\" fits that moment better than tapping.",
            ],
          },
          {
            kind: "step",
            title: "Part health on the machine itself",
            items: [],
            body: [
              "An AR overlay through a phone camera that shows each part's health on the real excavator during a walk-around.",
            ],
          },
          {
            kind: "step",
            title: "An estimator trained on a real fleet",
            items: [],
            body: [
              "Train the estimator on a real fleet's history instead of five tasks, and show a confidence range so operators learn how sure the model is.",
            ],
          },
          {
            kind: "step",
            title: "A shared component library",
            items: [],
            body: [
              "Turn the buttons, cards, gauges, radar and seatbelt icon into a documented component library, so the next build starts from design tokens instead of from scratch.",
            ],
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
                title: "My first drafts were a dashboard, not a cab.",
                body: "They looked like a generic AI dashboard with tinted cards, so I threw them out. A gloved hand in a cab needs fewer, bigger and louder things, and every screen had to pass that test before it looked finished.",
              },
              {
                title: "An estimate is only useful if it is honest about itself.",
                body: "The estimator's 2.4% error was measured on the same five tasks it learned from. I put that on screen instead of hiding it, because an operator who catches a model overselling itself stops trusting the rest of the tablet too.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "layover",
    lead:
      "**Layover** turns dead time in an airport into something usable: enter a terminal or a PNR and see what is open now, order a meal to the gate, book a lounge seat. I took it from zero to one across **four surfaces**, from the site travellers land on to the console the platform runs on.",
    services: ["Product design", "Visual branding"],
    headline:
      "Turning dead airport time into something you can actually use, across four interfaces",
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
      Figma frame 222:6942, 1600x22434, exported as its own twelve section
      frames rather than cut out of one raster - see
      scripts/layover-board.mjs. The heights Figma reports for those frames
      sum to exactly 22434, so the pieces reassemble the board with no gap
      and no doubled row.
    */
    caseBoard: {
      pieces: [
        "00-cover",
        "01-problem",
        "02-insight",
        "03-prep-time",
        "04-traveller",
        "05-counter",
        "06-onboarding",
        "07-operator",
        "08-brand",
        "09-explorations",
        "10-reflection",
        "11-close",
      ].map((n) => `/projects/layover/board/${n}.webp`),
      caption: "The full case study, in the order it was laid out.",
      alt: "The Layover case-study board: the billboard cover, the problem of ninety minutes nobody tells you how to use, the insight that both sides are solving the same equation from opposite ends, one number across five surfaces, the traveller's app, the restaurant counter, onboarding, the operator console, the brand system, the explorations that were discarded, a reflection, and the closing mark.",
    },
    caseBoardOnly: true,
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
    roleNote:
      "Lead product designer, zero to one: research, competitive analysis, information architecture and 20+ screens through to engineering handoff.",
    tools: ["Figma", "Prototyping"],
    description:
      "A layover is dead time you have already paid for, and Layover turns it into something usable: put in your airport or your PNR and it shows what is open in your terminal right now, so you can order a meal to your gate or book a lounge seat. I joined at zero and took it to four surfaces: the site people land on, the app they order from, the portal a restaurant runs its kitchen on, and the console the whole platform is operated from.",
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
      "An airport full of food and lounges, and no way to know what is open, how far it is, or whether you will make it back before boarding.",
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
            text: "Travellers were not struggling to order, they were struggling to predict time.",
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
    lead:
      "**Yantra** is VIT's week of technical events, workshops and hackathons, and until this site there was nowhere single to see what was on or sign up. I led the team that built its front door as a **3D environment** you walk into, with one sign-up portal underneath.",
    services: ["Website design", "Interaction design"],
    headline:
      "A 3D front door for a fest that otherwise reads like a timetable",
    challenge: [
      "A week of events, nowhere to see them together, and a format that reads like a timetable.",
      "Technical events, workshops and hackathons were spread across formats and audiences. And a page that lists everything accurately still reads like a timetable, which is not a reason to turn up.",
    ],
    solution: [
      "**I made the front door a 3D environment you walk into**, so the fest is somewhere you arrive rather than something you scroll past, and the experience does the persuading.",
      "Behind it sits one portal for technical events, workshops and hackathons, so once someone is convinced, signing up takes seconds.",
    ],
    title: "Yantra",
    logoText: "Yantra",
    category: "3D Interactive Website",
    year: "2026",
    cover: "/projects/yantra-cover.webp",
    preview: {
      kind: "website",
      href: "https://yantra-xi.vercel.app/",
      image: "/projects/yantra-cover.webp",
    },
    cta: "Visit Live Website",
    role: "Web Designer",
    roleNote:
      "Manager for Yantra: I led a 30+ member team to design and ship a performance-optimised 3D web experience.",
    tools: ["3D", "Web Design"],
    description:
      "Yantra is a week of technical events, workshops and hackathons at VIT, and until this there was no single place to see what was on or sign up for any of it. A page that only lists things reads like a timetable, so the front door was built as a 3D environment you walk into instead.",
    highlights: [
      "3D interactive environment built for high engagement",
      "Unified portal for technical events and hackathons",
      "Elevated event experience focused on holistic student growth",
    ],
    sections: [
      {
        name: "overview",
        blocks: [
          {
            kind: "statement",
            text: "I put the spectacle at the front and the work underneath, so neither gets in the other's way.",
          },
          {
            kind: "prose",
            body: [
              "A technical fest competes for a week of a student's life against lectures, deadlines and every other club running something on the same days. Accuracy is the easy half of that argument.",
              "It also had to load. A 3D front door is worthless if it stalls on hostel Wi-Fi, so the scene was built for low-end devices and weak networks.",
            ],
          },
        ],
      },
      {
        name: "outcome",
        blocks: [
          {
            kind: "results",
            items: [
              { value: "100K+", label: "visits" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "dropby",
    lead:
      "**DropBy** is an app for people who want to see other people without performing it, and it rewards you for showing up rather than posting. I rebuilt its identity around the product's own **radar ping**, so the brand finally says what the app does.",
    services: ["Brand identity", "Visual branding"],
    headline:
      "Rebuilding a shy brand around the radar ping that gets people off the sofa",
    /* a brand system with a full deep dive behind it, so it belongs in both */
    alsoCaseStudy: true,
    challenge: [
      "A product about showing up, and an identity that said none of it.",
      "There was no cohesion, no typographic clarity and no colour strategy, so every touchpoint looked like a different app, and nothing in the writing sounded like a person.",
      "A brand whose one job is to get somebody off the sofa cannot be the quietest thing on the screen.",
    ],
    solution: [
      "**I built the brand out of the product.** The radar ping, the app's own drop mechanic, became the repeating element: the mark, the layouts and the campaign are the same gesture at different sizes.",
      "One loud blue carries the system, warm accents break it before it goes cold, and a bolder sans lets a headline hold a wall on its own. The voice is written the way you would say it to a friend already comfortable at home: **Just Drop By.**",
    ],
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
    role: "Brand Designer",
    roleNote:
      "Brand designer with Crestic Era: identity, logo, colour, the design system and the launch campaign.",
    tools: ["Figma", "Illustrator", "Photoshop"],
    description:
      "DropBy is for people who want to see other people without performing it: the app rewards you for showing up, not for posting. The old brand said none of that, so this rebuild takes the app's own radar ping and makes it the thing the whole identity is built out of.",
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
            kind: "statement",
            text: "The identity was already inside the product, in the radar ping every user sees when they drop by.",
          },
          /* the About beat: the two paragraphs that sit under that line */
          {
            kind: "prose",
            body: [
              "DropBy exists for the person who wants to see people and does not want to perform doing it. The product already understood that. It counts the turning up, not the posting about it.",
              "The identity was arguing the other way. Quiet, unsure, easy to scroll past, which is a strange thing to be when your entire pitch is that somebody should get off the sofa tonight.",
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
              { name: "Bandis Blue", hex: "#006FFF", use: "The primary, and the only colour that shouts" },
              { name: "Rich Black", hex: "#0D0F1E", use: "The night side of the brand" },
              { name: "Alice Blue", hex: "#F5F8FE", use: "The light canvas" },
              { name: "Munsell", hex: "#EF013D", use: "Accent, the hot end of the gradient" },
              { name: "Tomato", hex: "#FF4A2C", use: "Warm accent for energy" },
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
            title: "A campaign you finish by reading the set",
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
              "The lines are **half-sentences that finish across panels**, so the radar arc carries your eye from one poster to the next and the campaign only completes if you read the set.",
              "The copy stays spoken: didn't plan to meet, but glad I dropped by. Nothing in it sounds like a platform describing its features.",
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
    lead:
      "**Futurepreneurs 10.0** is E-Cell VIT Vellore's flagship business simulation. I designed its site around the one fact a student scanning on a phone actually leaves with: whether they have missed the deadline yet.",
    services: ["Website design", "Graphic design"],
    headline:
      "The tenth edition, led with the deadline, because that is the only fact anyone acts on",
    challenge: [
      "Read once, fast, on a phone, by someone deciding whether to bother.",
      "Everything on the page competes with the one fact that matters, the deadline. And a multi-week campaign means the content changes constantly, with no developer on call to ship any of it.",
    ],
    solution: [
      "**I led with the countdown, not the copy.** The clock is the first thing on the page, and from anywhere else on it the deadline is never more than a scroll away.",
      "Five dates get their own visual system so the timeline reads as a sequence, and one accent colour carries the page where a fest poster would have used ten.",
      "I designed it in Framer so the team could run the campaign themselves and keep changing the site right up to the morning of the event.",
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
    role: "Web Designer",
    roleNote:
      "Web designer for E-Cell VIT: I designed the site in Framer so the team could run the whole campaign themselves.",
    tools: ["Framer", "Figma"],
    /* Figma frame 2008:331, exported whole at 2x and brought down to the
       1600px this project's other captures use. See
       scripts/futurepreneurs-board.mjs. */
    caseBoard: {
      pieces: ["/projects/futurepreneurs/board.webp"],
      alt: "The full Futurepreneurs case-study board: the landing page, the about copy, desktop and phone mockups, the Whyte Inktrap, Almarai and Gantari type specimens, the four-colour theme, the process map, and the complete site in both views.",
      caption: "The full case-study board, in the order it was laid out.",
    },
    description:
      "Futurepreneurs 10.0 is E-Cell VIT Vellore's flagship business simulation, and its site gets read once, fast, on a phone, by somebody deciding whether to bother. Everything on the page competes with the only fact that changes their mind, so the countdown leads and the copy follows it.",
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
          {
            kind: "statement",
            text: "A tenth edition has to look like one, and fest-poster maximalism is exactly what makes a student event look like a student event.",
          },
          /* the About beat: the two paragraphs that sit under that line */
          {
            kind: "prose",
            body: [
              "Nobody reads an event site. They scan it on a phone, between two other things, and leave with a single fact: whether they have missed it yet.",
              "So I built the page around that fact rather than around the event. The format, the prizes and the story of nine previous editions are there for the person the clock has already convinced.",
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
              /*
                Whole, and at the width of the page it sits on.

                This is 1600x4465, which the media rows read as a portrait
                and hold to a screenful tall - and a screenful tall at 0.358
                is a 277px-wide website with the desktop page 122px across
                inside it. fullPage takes it out of that arithmetic: it is
                shown at the full column, uncropped, the length it is.
              */
              fullPage: true,
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
    lead:
      "**Posterfolio** is forty-one posters, from startup teardowns and product launches to editorial covers, merch and title cards, every one held to a **4:5 frame**. Fixing the format left composition, type and contrast as the only variables, which was the point.",
    services: ["Graphic design", "Poster design"],
    headline:
      "Forty-one posters on one 4:5 canvas, where the only thing allowed to change is the thinking",
    challenge: [
      "One rectangle, forty-one subjects.",
      "A startup teardown, a title card and a streetwear drop want completely different energy, and all of them have to come out of the same 4:5 frame.",
    ],
    solution: [
      "**I judged every poster small before judging it large.** If the idea did not survive the thumbnail, I rebuilt the composition rather than making the type bigger.",
      "Holding one format across 41 subjects turned a set of posters into a practice, and the range is the proof: the same rectangle changes temperature without changing shape.",
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
    role: "Graphic Designer",
    tools: ["Photoshop", "Illustrator", "Figma"],
    description:
      "Forty-one posters on one canvas: startup teardowns, product launches, editorial covers, merch and title cards, every one of them 4:5. Holding the format still means nothing can be fixed by changing the shape of the page, which leaves composition, type and contrast as the only things there are to get right.",
    highlights: [
      "41 posters across startup, editorial, product and merch briefs",
      "One 4:5 format throughout, so the variation is in composition rather than canvas",
      "Type-led layouts built to read at thumbnail size before they read at full size",
    ],
    extraFacts: [
      ["Posters", "41"],
      ["Format", "4:5, poster"],
    ],

    /*
      Forty-one, because the headline says forty-one.

      A project with no named screens and no results is read as visual-only
      and gets a gallery of twenty-four, which is a sensible default for work
      that has something else to say. Here the count IS the argument - "the
      only thing allowed to change is the thinking" only lands if the whole
      series is on the page - and fourteen posters were being dropped off the
      end of it.
    */
    caseLimits: { gallery: 45, images: 60 },
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
          {
            kind: "statement",
            text: "Every poster gets the same rectangle, so the only thing left to improve is the thinking.",
          },
          /* the About beat: the two paragraphs that sit under that line */
          {
            kind: "prose",
            body: [
              "Almost nobody sees a poster at poster size any more. They see it small, in a feed or a grid, next to forty other things competing for the same second.",
              "The fixed frame is the useful part. Every improvement has to come from composition, type or contrast, and there is nowhere to hide a weak idea.",
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
    lead:
      "**Gravitas** is VIT Vellore's techno-management fest, and its website is how thousands of students find their way through **200+ events** in three days. I redesigned it from a wall of text into a catalogue you can cut down to the handful of events that apply to you.",
    services: ["Website design", "Visual branding"],
    headline:
      "Turning a 200-event wall of text into a catalogue a student can book from",
    /* a shipped site and a full deep dive, so it belongs in both lists */
    alsoCaseStudy: true,
    /* Written rather than assembled, so the Details beat argues the same
       thing the page does instead of quoting two brief labels at each other. */
    challenge: [
      "Two hundred events, one wall of text, and the same page for everyone.",
      "The site had scaled into **content saturation**. A first-year looking for a beginner workshop and a final-year hunting a hackathon got identical pages, in the same order, with no way to narrow them.",
      "And a maybe had nowhere to go. An event you liked but were not ready to pay for could not be saved, so coming back meant starting the search over.",
    ],
    solution: [
      "**I asked who you are before asking what you want.** Role-based sign-in filters the catalogue the moment you arrive, so the page starts narrow instead of starting with everything.",
      "Then filters for category, price and team size, and a **wishlist ahead of the receipts**, so a maybe has somewhere to go. A retro-tech system of hard grid, pixel type and high-contrast panels makes the density read as organisation rather than noise.",
    ],
    title: "Gravitas",
    logoText: "GRAVITAS·25",
    logoUrl: "/projects/gravitas-logo.webp",
    category: "Website Design",
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
    role: "Web Designer",
    roleNote:
      "Web designer, with the Gravitas'25 Design and Print team: sign-in, the event catalogue, filters and the profile.",
    tools: ["Figma", "Illustrator"],
    description:
      "Gravitas is VIT Vellore's flagship techno-management fest, and its website is where thousands of students find and register for a catalogue of more than 200 events. The old one had grown into a wall of text that everybody saw the same way, so this is a rebuild around a retro-tech system that turns browsing into booking.",
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
          /* the About beat: the two paragraphs that sit under the statement
             band, which is a whole screen holding one line */
          {
            kind: "prose",
            body: [
              "A fest site gets about ten seconds from a student who already half knows what they want. Gravitas had the opposite problem to most sites: nothing was missing, everything was there at once.",
              "Two hundred events is a good problem to have and a terrible page to read. Most of my rebuild is about giving a student permission to ignore nearly all of it.",
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
            text: "Nobody was failing to find events, they were failing to get from two hundred of them down to one.",
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
              "I treated the site as a system that responds to who is using it, not a board that shows everything to everyone.",
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
            title: "One tap removes every irrelevant field",
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
              "Picking **VIT student or external participant** first means the form only asks what that person can answer. A student never sees organisation fields, and an external participant is never asked for a registration number.",
              "It also lets the catalogue, pricing and eligible events change **without the user filtering for any of it**.",
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
            title: "Filters that stay open",
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
              "A catalogue this size is used by narrowing again and again, so the filters live in a **persistent rail** instead of behind a button. Category, price and team size are the three questions students actually arrive with.",
              "Every card carries **time, date, team size and price on its face**, because those decide whether an event is even possible for you.",
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
            title: "A wishlist before the receipts",
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
              "Students shortlist events, check them with friends and a timetable, then book. So the **wishlist is the first tab** in the profile, ahead of purchases: a profile organised around what you meant to do next is a way back in.",
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
      {
        name: "reflection",
        heading: "What I learned",
        blocks: [
          {
            kind: "lessons",
            items: [
              {
                title: "Filtering starts before the filters.",
                body: "The biggest cut to the catalogue did not come from the filter rail. It came from one question at sign-in, answered once, that quietly removed everything a student could never attend.",
              },
              {
                title: "Intent needs somewhere to wait.",
                body: "Shortlisting is how these decisions actually get made. Without a wishlist, every maybe was lost the moment the tab closed.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "meal-maestro",
    lead:
      "**Meal Maestro** is a meal-planning app built on one finding: for busy professionals, the hard part is not cooking, it is deciding. It takes what you like, what you avoid and what is in your kitchen, and returns a week of recipes with the one grocery list that covers them.",
    services: ["UI design", "Product design"],
    headline:
      "Planning a week of food without making a single decision",
    challenge: [
      "Every app gives you recipes. None gives you a plan.",
      "Working professionals aged 28 to 45 said it plainly: “by the time I’m home, I’ve got no decisions left in me.” Twelve interviews and 140 survey responses pointed at the same cause: not motivation, but time and cognitive space.",
      "Most apps answer with more options at seven in the evening, which adds to the exact thing that broke the week.",
    ],
    solution: [
      "**Automation over education.** The app does the planning instead of teaching someone to plan, and returns a week of recipes with the one grocery list that covers them.",
      "Planning and groceries stay one flow, because the research was blunt that disconnected tools are friction people refuse to tolerate. Personalisation is the retention mechanism, not a settings screen, and a tracker keeps progress visible so a good week reads as one.",
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
    role: "UI Designer",
    roleNote:
      "UI and product designer across research, synthesis, the design system and the core flows.",
    tools: ["Figma"],
    description:
      "Meal Maestro is a meal-planning app built on the one thing twelve interviews kept saying: the hard part is not the cooking, it is the deciding. It takes what you like, what you avoid and what is already in your kitchen, and hands back a week of recipes with the single grocery list that covers all of them.",
    extraFacts: [
      ["Recognition", "3rd: GDG Design-a-thon"],
      ["Research", "12 interviews · 140 survey responses · 5 weeks"],
    ],
    highlights: [
      "Grounded in primary research: 12 discovery interviews, 140 survey responses and 4 comparison teardowns",
      "Built on why people abandon meal planning, not on what an app could do",
      "Full design system: Poppins for display and headings, Open Sans for body",
    ],
    /* The About beat, written rather than assembled: the line the page opens
       on, and the two paragraphs underneath it. The 22,306px case-study strip
       below is untouched by this, since neither block carries an image. */
    sections: [
      {
        name: "overview",
        blocks: [
          {
            kind: "statement",
            text: "People do not give up on meal planning because they cannot cook, they give up because by Wednesday they have no decisions left.",
          },
          {
            kind: "prose",
            body: [
              "Almost everybody who quits meal planning quits in the same place, and it is never the stove. It is a Wednesday evening, at the end of a working day, in front of a fridge.",
              "So the product had to remove decisions rather than add features, which is the opposite of what the category does. Twelve interviews, 140 survey responses and third place at the GDG Design-a-thon all came out of following that one line.",
            ],
          },
        ],
      },
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
    /*
      This was authored as `shots`, which renders only on a project that has
      neither a gallery nor highlights - and this one has highlights, so all
      eighteen slices of it have been in the repository and on nobody's
      screen. As a board it is where it was always meant to be: after
      section 2, at the width of the window.
    */
    /*
      Figma frame 381:885, 1920x25254, re-exported and divided into ten
      sections - see scripts/board-sections.mjs. This replaces an
      earlier pass at 1400px in 18 even slices, which was under the width
      of the window it is shown at and cut wherever 1240px happened to
      land. The cuts are now found in the picture: this board is one flat
      canvas rather than a stack of section frames, so the script walks it
      looking for rows with no edge anywhere along them and takes those.
    */
    caseBoard: {
      pieces: Array.from(
        { length: 10 },
        (_, i) => `/projects/meal-maestro/board/s${String(i).padStart(2, "0")}.webp`,
      ),
      caption:
        "The full case study: research with real users, the insights it earned, the design system, and the flows it produced.",
      alt: "The Meal Maestro case study: a smart meal-planning app for personalised recommendations and nutrition guidance. It runs from the goal of making healthy eating simpler, through branding and primary research grounded in real voices and real data (12 discovery interviews, 140 survey responses, 4 comparison teardowns, 5 weeks), into key insights about why people abandon meal planning, then a design system of colour and type: Poppins for display and headings, Open Sans for body: and finally the home, recipe detail, tracker and explore flows.",
    },
  },
  {
    id: "aiu",
    lead:
      "The **Association of Indian Universities** has brought Indian universities together since 1925. I redesigned its seal for everywhere it now has to appear, keeping the architecture and symbolism and giving it the weight to survive as a favicon as well as a stamp.",
    services: ["Visual branding", "Graphic design"],
    headline:
      "Redrawing the seal of a body that has represented every university in India since 1925",
    challenge: [
      "A century-old seal that only works at the size it was drawn.",
      "It has to hold on a degree certificate, a letterhead, a keychain and a 25px avatar, without losing any of the symbolism that makes it the AIU's own.",
    ],
    solution: [
      "**Weight, not simplification.** The seal keeps its ring of type, the building and the open book, and gains the mass to hold together small or printed in one colour.",
      "**A floor I measured rather than asserted.** I set the mark out at 100, 50, 30 and 25px and named 25px as the minimum; below 35px it starts losing its identity, so the guidance says to stay above that.",
      "Six values, each carrying meaning: deep blue for wisdom, stability and trust, and the tricolour's orange, white and green beneath the open book, supporting the motto, एकता विद्या शक्ति, rather than decorating it.",
    ],
    kind: "case-study",
    title: "Association of Indian Universities",
    logoText: "AIU",
    category: "Branding",
    year: "2024",
    cover: "/projects/aiu-cover.webp",
    preview: {
      kind: "image",
      src: "/projects/aiu-cover.webp",
    },
    cta: "See the Identity",
    role: "Brand Designer",
    tools: ["Figma", "Illustrator"],
    description:
      "The Association of Indian Universities has been the central body bringing Indian universities together since 1925. This is a redesign of its seal: the same architecture and the same symbolism, given the weight to survive being a favicon as well as a stamp, with a stated minimum size and a six-value palette where every value means something.",
    highlights: [
      "A seal redrawn for weight rather than simplified, so the symbolism survives",
      "A measured size ladder down to a stated 25px floor",
      "Six brand values, each tied to what the mark is saying",
    ],
    extraFacts: [
      ["Client", "Association of Indian Universities"],
      ["Founded", "1925"],
      ["Scope", "Logo redesign and identity"],
    ],
    /*
      The board names its own palette, and most of it cannot be an accent.
      #0a2c50 is 14.1:1 on white and carries the light side outright, but on
      #1e1e1e it is 1.18 and invisible; the mid blue #026adc only reaches
      3.25 there, under the 4.5 real text needs. So `dark` is that blue
      lightened to #6aa6ea, which measures 6.55:1 on ink.

      `bright` is the yellow the board uses for its own badges and section
      markers, sampled off the file at #f6c600 - the one colour in the set
      that exists to be spotted rather than read through. `ink` is the brand
      navy, which is what reads on it; white on that yellow is about 1.4:1.
    */
    accent: {
      dark: "#6aa6ea",
      light: "#0a2c50",
      solid: "#0a2c50",
      bright: "#f6c600",
      ink: "#0a2c50",
      fill: "#0a2c50",
      hover: "#17406e",
    },
    /*
      Nine frames, exported one per slide at 2x through the Figma REST API
      and ordered by their y position on the canvas rather than by layer
      order - see scripts/board-slides.mjs. 5120px wide, written at 2400 for
      1000kb total.
    */
    /* the About beat, written rather than falling back to the description */
    sections: [
      {
        name: "overview",
        blocks: [
          { kind: "statement", text: "A century-old seal cannot be swapped for something fashionable, so I kept everything and changed its weight." },
          {
            kind: "prose",
            body: [
              "The existing mark is a line drawing: fine strokes, a full circle of type and detail that only survives at the size it was drawn. On a small avatar it loses its centre entirely.",
              "The tricolour, the open book, the graduation cap and the Sanskrit motto all had to stay, and all had to stay legible.",
            ],
          },
        ],
      },
    ],
    caseBoard: {
      pieces: Array.from(
        { length: 9 },
        (_, i) => `/projects/aiu/board/s${String(i).padStart(2, "0")}.webp`,
      ),
      caption: "The full identity board, in the order it was laid out.",
      alt: "The AIU identity board: a summary card carrying the mark, the about copy, the technical parameters and the applications; the LOGO REDESIGN title card; the existing line-drawn seal beside the new concept; the inspiration behind the symbolism; the six-value colour palette; the size breakdown from 100px down to a 25px minimum; the mark on a clipboard, keychain, cup and t-shirt; the business card, sticker and letterhead; and the closing frame.",
    },
  },
  {
    id: "moon-store",
    lead:
      "**Moon Store** is a high-end fashion storefront for a Gen-Z shopper, with a configurator, **LunarLook**, that lets you choose a garment's fabric, quality and style before you buy. I designed the web and mobile UI around a single photograph of the moon.",
    services: ["UI design", "Interaction design"],
    headline:
      "A Gen-Z clothing store built around one photograph of the moon, where the thing you buy is the thing you configure",
    challenge: [
      "Luxury on a label with no luxury budget, and a factory inside a shopping flow.",
      "Seven routes, men, women, sneakers, oversized tees, retro flannels, hoodies and sweatshirts, lead into one catalogue, and a shopper who cannot find their aisle on the first screen leaves.",
    ],
    solution: [
      "**One photograph carries the whole brand.** The moon sits behind login, bag, payment and shipping, on near-black at the same scale every time, and a three-value palette leaves the product photography as the only colour in the room.",
      "**LunarLook is a form, not a factory.** Five questions on one screen, fabric, manufacture, quality, GSM and style, then a separate Customise step for artwork, colour and size, so manufacturing decisions never interrupt the buy.",
      "Krona One sets only section titles and Sora carries everything a shopper reads. That contrast is what makes a three-colour page feel designed rather than unfinished.",
    ],
    kind: "case-study",
    title: "Moon Store",
    logoText: "MOON",
    category: "UI Design",
    year: "2023",
    cover: "/projects/moon-store-cover.webp",
    preview: {
      kind: "image",
      src: "/projects/moon-store-cover.webp",
    },
    cta: "See the Screens",
    role: "UI Designer",
    tools: ["Figma"],
    description:
      "Moon Store is an online platform for high-end fashion aimed at a Gen-Z shopper: a lunar-inspired storefront where the homepage does the selling, seven category routes keep a wide catalogue navigable, and LunarLook lets a customer specify the fabric, quality and style of the garment before they buy it.",
    highlights: [
      "Seven browse routes into one catalogue: men, women, sneakers, oversized tees, retro flannels, hoodies and sweatshirts",
      "LunarLook, a five-field configurator for fabric, manufacture, quality, GSM and style",
      "A three-value palette, so the product photography is the only colour on the page",
    ],
    extraFacts: [
      ["Brand", "Moon"],
      ["Scope", "Web and mobile UI"],
      ["Typefaces", "Sora, Krona One"],
    ],
    /*
      A monochrome brand: white, #060505 and #87888A, and that is the whole
      palette. None of the three can be an accent - the grey is 3.55:1 on
      white and fails body text, the black cannot read on ink, the white
      cannot read on paper.

      So the accent is the slate the board uses for its own titles, which is
      the one hue in the deck. #485060 is 8.1:1 on white and 6.96:1 on the
      cream; its light end, #ccd2de, is 10.99:1 on #1e1e1e. `ink` is the
      brand's near-black, 13.42:1 on that light slate.
    */
    accent: {
      dark: "#ccd2de",
      light: "#485060",
      solid: "#485060",
      bright: "#ccd2de",
      ink: "#060505",
      fill: "#485060",
      hover: "#5a6478",
    },
    /*
      Twelve slides, arriving as twelve separate 4x exports rather than one
      tall frame - see scripts/board-slides.mjs. 7680px wide and about 50MB
      of PNG between them, written at 2400 for 1115kb total.
    */
    /* the About beat, written rather than falling back to the description */
    sections: [
      {
        name: "overview",
        blocks: [
          { kind: "statement", text: "Luxury the brand could not buy had to come from restraint, so one photograph of the moon carries the whole store." },
          {
            kind: "prose",
            body: [
              "Gen-Z fashion storefronts all resolve to the same page, a grid of products on white. The brief wanted luxury and exclusivity from a label with none of a luxury house's budget.",
              "And the differentiator was customisation, the hardest thing to fit inside a shopping flow: fabric, GSM and manufacture are factory questions asked of somebody who just wants a t-shirt.",
            ],
          },
        ],
      },
    ],
    caseBoard: {
      pieces: Array.from(
        { length: 12 },
        (_, i) => `/projects/moon-store/board/s${String(i).padStart(2, "0")}.webp`,
      ),
      caption: "The full case study, in the order it was laid out.",
      alt: "The Moon Store case-study board: the cover on a laptop and phone, the about and features copy with a research-ideate-design timeline, the Sora and Krona One type specimens beside a white, black and grey palette, the homepage interface, the product page with the oversized tees and retro flannel rails, the hoodies rail and mobile view beside the LunarLook configurator and the Customise screen, the six onboarding and shopping screens, two product previews, the women, men, sneakers and oversized tees category pages, a desktop mockup, a bento of every screen, and the closing frame.",
    },
  },
  {
    id: "ip-tt-cell",
    lead:
      "VIT's **Intellectual Property and Technology Transfer Cell** protects what the university invents and moves it into industry. I designed a first-round identity for it: a single pillar, a **Sthambh**, built from the letters I, P and TT.",
    services: ["Brand identity", "Graphic design"],
    headline:
      "One pillar that spells I, P and TT, for the cell that turns university research into patents",
    challenge: [
      "Five words nobody reads twice.",
      "Whatever replaced the name had to hold at the size of a favicon and the size of a building sign, and read as credible to researchers inside the university and industry outside it.",
    ],
    solution: [
      "**One monolithic form, not a monogram.** I merged I, P and TT into a single Sthambh, a pillar, so the acronym is the shape rather than letters standing side by side. The vertical mass is where the authority comes from.",
      "The IP cycle is built into the letterform: the I is the core pillar, the P carries a square for research and a circle for commercialisation, and the TT resolves as twin pillars for the two-way flow between academia and industry.",
      "I proved it as a solid before it was a lockup, on a construction grid and on four grounds, so versatility was tested rather than assumed.",
    ],
    kind: "case-study",
    title: "IP-TT Cell",
    logoText: "IP&TT Cell",
    category: "Branding",
    year: "2024",
    cover: "/projects/ip-tt-cell-cover.webp",
    preview: {
      kind: "image",
      src: "/projects/ip-tt-cell-cover.webp",
    },
    cta: "See the Identity",
    role: "Brand Designer",
    roleNote:
      "Brand designer: logo and identity direction, first round for selection.",
    tools: ["Figma"],
    description:
      "VIT's Intellectual Property and Technology Transfer Cell protects what the university invents and gets it into industry. The identity is a single pillar built out of the letters I, P and TT - a Sthambh, for the strength and foundation the Cell exists to give research.",
    highlights: [
      "A monolithic mark that merges I, P and TT into one pillar rather than a monogram",
      "The IP cycle drawn into the letterform: a square for research, a circle for commercialisation",
      "Tested as a solid on four grounds before any lockup was set",
    ],
    extraFacts: [
      ["Client", "IP&TT Cell, VIT Vellore"],
      ["Scope", "Logo and identity direction"],
      ["Stage", "First round, for selection"],
    ],
    /*
      Navy is the whole identity - 44% of the board by area - and it reads
      on paper at 11.6:1, so it carries the light side on its own. It cannot
      carry the dark side: on #1e1e1e it is nearly invisible, so `dark` and
      `bright` take the mid blue the board uses for the two-tone concept
      marks, which measures 5.75:1 there.

      `ink` is near-black rather than white because white on that mid blue
      is 2.9:1 and fails outright; near-black on it is 6.03:1.
    */
    accent: {
      dark: "#8098c8",
      light: "#23395b",
      solid: "#23395b",
      bright: "#8098c8",
      ink: "#0e1a2b",
      fill: "#23395b",
      hover: "#2f4a75",
    },
    /*
      Figma frame 2001:2, 1920x17280, divided into seven sections - see
      scripts/board-sections.mjs. Like Meal Maestro's this board is one flat
      canvas rather than a stack of section frames, so the cuts were found
      by walking it for rows with no edge along them; all seven landed in a
      gap with none forced through content.
    */
    /* the About beat, written rather than falling back to the description */
    sections: [
      {
        name: "overview",
        blocks: [
          { kind: "statement", text: "I turned the acronym into a shape, a pillar you remember instead of five words you skip." },
          {
            kind: "prose",
            body: [
              "The Cell sits between researchers inside the university and industry outside it, and each trusts different things. A mark that reads as a student society to one, or as a law firm to the other, loses the half it was meant to convince.",
              "It was a first round against a deadline, so I settled the form before the detail. A mark that is only right once it is finished cannot be reviewed.",
            ],
          },
        ],
      },
    ],
    caseBoard: {
      pieces: Array.from(
        { length: 7 },
        (_, i) => `/projects/ip-tt-cell/board/s${String(i).padStart(2, "0")}.webp`,
      ),
      caption: "The full identity board, in the order it was laid out.",
      alt: "The IP&TT Cell identity board: the navy title lockup, the mark on its own, the research behind the Cell and the logo concept, the Ashoka pillar and the I-P-TT letters it came from, the construction grid in light and dark, the design process, the concept marks in outline and two-tone, the mark on black, grey, mid blue and navy, business card and website mockups, and the final lockups.",
    },
  },
  {
    id: "solo-leveling",
    lead:
      "**Solo Leveling** is a self-directed UI concept for fans of the series: one site for the episodes, the manga, the news and the merch. I designed it to route fans to where the series actually streams rather than pretend to host it.",
    services: ["UI design", "Interaction design"],
    headline:
      "One place to watch it, read it and buy the shirt, for a fandom currently sent to three",
    challenge: [
      "Everything a fan cares about lives on a different site.",
      "Nobody owns the relationship with the person who cares most, so the fan does all the joining up between sites.",
    ],
    solution: [
      "**One nav, six routes**: Store, Merch, Updates, News, Ongoing and Upcoming, so the series and the shop sit under one roof.",
      "**Three values and nothing else**, #FFFFFF, #130423 and #2B1445, so the key art supplies every other colour and the interface stays out of its way.",
      "**It points outward instead of pretending.** The Rating, Stream and Manga row names where the series actually lives, IMDb, Prime, Crunchyroll and Mangareader, because a fan site that claims to host everything is lying.",
      "Commerce is a real flow, not a button: product page, size and quantity, wishlist, bag, shipping and four payment routes, all in the same dark.",
    ],
    kind: "case-study",
    title: "Solo Leveling",
    logoText: "SOLO LEVELING",
    category: "UI Design",
    year: "2023",
    cover: "/projects/solo-leveling-cover.webp",
    preview: {
      kind: "image",
      src: "/projects/solo-leveling-cover.webp",
    },
    cta: "See the Screens",
    role: "UI Designer",
    tools: ["Figma"],
    description:
      "A self-directed UI concept for the anime Solo Leveling: one site that carries the episodes, the manga, the news and the merch, with a video player, a full shop flow and a rating row that routes fans to where the series actually streams rather than pretending to host it.",
    highlights: [
      "One nav over six routes: store, merch, updates, news, ongoing and upcoming",
      "A video player built around a season rather than a single episode",
      "A full commerce flow - grid, product, wishlist, bag, shipping and four payment routes",
    ],
    extraFacts: [
      ["Type", "Self-directed concept"],
      ["Scope", "Web and mobile UI"],
      ["Typeface", "Sora"],
    ],
    /*
      The board states three values and all three are ground, not accent:
      #130423 and #2b1445 are 19.6:1 and 16.3:1 on white and carry the light
      side outright, but on #1e1e1e they are 1.18 and 1.02 - invisible.

      So the dark side takes the lavender the interface itself runs on,
      sampled off the screens at #d0b8f8, which measures 9.44:1 on ink. It
      is the same colour the buttons, links and form fields use, so nothing
      here is invented. `ink` is the deeper of the two grounds, 11:1 on that
      lavender.
    */
    accent: {
      dark: "#d0b8f8",
      light: "#2b1445",
      solid: "#2b1445",
      bright: "#d0b8f8",
      ink: "#130423",
      fill: "#2b1445",
      hover: "#3d1d61",
    },
    /*
      Fourteen slides, exported at 3x (5760px) and written at 2400 for
      1338kb - see scripts/board-slides.mjs. Numbered 1.png..14.png with no
      stem, which is why that script checks its prefix for presence rather
      than for truth.
    */
    /* the About beat, written rather than falling back to the description */
    sections: [
      {
        name: "overview",
        blocks: [
          { kind: "statement", text: "Fans get handed between a streamer, a manga reader and a merch shop, so I designed the one place that holds all of it." },
          {
            kind: "prose",
            body: [
              "The art is both the draw and the problem. Solo Leveling's key art is dense, high-contrast and already purple, and an interface laid over it disappears into it.",
              "It also had to be a shop as well as a library, with sizes, a bag and payment inside what is otherwise a watching and reading experience.",
            ],
          },
        ],
      },
    ],
    caseBoard: {
      pieces: Array.from(
        { length: 14 },
        (_, i) => `/projects/solo-leveling/board/s${String(i).padStart(2, "0")}.webp`,
      ),
      caption: "The full case study, in the order it was laid out.",
      alt: "The Solo Leveling case-study board: the title card on a laptop, the about and features copy beside a phone, the Sora specimen and three-value palette, the homepage interface, the about section, the rating, stream and manga row with the watch-now player, the manga carousel and wallpapers, the merch rail and footer, the season video player, the merch grid and secondary screens, the onboarding and checkout screens, the product page for the Level UP hoodie, a laptop mockup, and the closing frame.",
    },
  },
  {
    id: "gravitas-showcase",
    lead:
      "**graVITas '25** is VIT's techno-management fest: 250+ events, 30,000+ attendees and participants from around the world. As design coordinator I held its identity together across the logo, website, merchandise, ID cards, print, hoardings and the entrance gate, with one dark ground and a single cyan.",
    services: ["Visual branding", "Graphic design"],
    headline:
      "One identity stretched across a website, a gate, an ID card and a t-shirt, for a fest with 250 events and 30,000 people",
    challenge: [
      "One fest, hundreds of pieces, many hands.",
      "The same system had to hold on hoardings, lanyards, certificates, merchandise, a gate and a registration page, each made to its own deadline.",
    ],
    solution: [
      "**The mark carries the name inside it.** graVITas sets VIT in the middle of its own word with an orbital ring around it: a wordmark, a monogram and the fest's idea in one form.",
      "**One dark ground, one cyan.** Every surface sits on near-black with a single electric cyan doing all the signalling, so a piece is recognisable before it is read.",
      "**Proved on the hardest surfaces.** Six ID card variants from Chief Patron to Volunteer, a gate taken from sketch to a built structure, certificates, merchandise, hoardings and brochures.",
    ],
    kind: "case-study",
    title: "Gravitas Identity",
    logoText: "graVITas '25",
    category: "Branding",
    year: "2025",
    cover: "/projects/gravitas-showcase-cover.webp",
    preview: {
      kind: "image",
      src: "/projects/gravitas-showcase-cover.webp",
    },
    cta: "See the Showcase",
    role: "Design Coordinator",
    roleNote:
      "Design coordinator for graVITas '25: identity, web and print across the fest.",
    tools: ["Figma", "Illustrator", "Photoshop"],
    description:
      "graVITas '25 is VIT's techno-management fest: 250+ events, 30,000+ attendees and participants from across the globe. This is the identity built for it - logo, website, merchandise, ID cards, brochures, flyers, hoardings, certificates and the entrance gate - held together by one dark ground and a single cyan.",
    highlights: [
      "A wordmark that sets VIT inside graVITas, ringed by an orbital mark",
      "One identity carried across ten surfaces, from a website to a built gate",
      "The site drew 2+ million views in its first two weeks",
    ],
    extraFacts: [
      ["Event", "graVITas '25, VIT Vellore"],
      ["Scale", "250+ events, 30,000+ attendees"],
      ["Scope", "Identity, web and print"],
    ],
    /*
      The brand is one cyan on near-black, and the cyan cannot carry the
      light side: #40e0f8 is 10.5:1 on ink but 1.59:1 on white, which is
      invisible. So light-mode text drops to #0a6b76, a deeper teal of the
      same hue at 5.34:1 on the cream, while `solid` and `bright` keep the
      real brand value for borders and anything meant to be spotted.

      `ink` is the near-black the whole board sits on, 12.3:1 on that cyan.
    */
    accent: {
      dark: "#40e0f8",
      light: "#0a6b76",
      solid: "#40e0f8",
      bright: "#40e0f8",
      ink: "#001018",
      fill: "#0a6b76",
      hover: "#086069",
    },
    /*
      Figma frame 236:6257, 1920x17280. Sixteen children, contiguous and
      exactly 1080 design px each, so the 3641x32768 export divides into 16
      equal bands of 2048 with no remainder - the boundaries were already
      known, so no cut detection was used or wanted.
    */
    /* the About beat, written rather than falling back to the description */
    sections: [
      {
        name: "overview",
        blocks: [
          { kind: "statement", text: "Many people made the pieces at different times, so the system had to be recognisable before anything on it was read." },
          {
            kind: "prose",
            body: [
              "Every one of 250+ events needs something printed, worn, hung on a lanyard or walked through. Without one system, a fest's identity drifts between the poster and the pass.",
              "And the physical and the digital pull opposite ways: a hoarding is read at fifty metres, an ID card at fifty centimetres, and a website in the three seconds it takes to decide whether to register.",
            ],
          },
        ],
      },
    ],
    caseBoard: {
      pieces: Array.from(
        { length: 16 },
        (_, i) => `/projects/gravitas-showcase/board/s${String(i).padStart(2, "0")}.webp`,
      ),
      caption: "The full showcase, in the order it was laid out.",
      alt: "The graVITas '25 showcase board: the cover lockup, an introduction to the fest, the logo from first exploration through iterations to the final mark, two spreads of the event website, merchandise, two sets of ID cards from Chief Patron down to Volunteer, brochures, flyers, hoardings, the entrance gate from sketch to built structure, flyer design, certificates, the branding system, and the closing mark.",
    },
  },
  {
    id: "posterfolio-vol2",
    lead:
      "**Posterfolio Vol. 2** is six typographic posters on distance, silence and the kinds of hurt that do not announce themselves, each paired with a short piece of writing of its own.",
    services: ["Graphic design", "Poster design"],
    headline:
      "Six posters about the same quiet subject, each one written down as carefully as it was drawn",
    kind: "case-study",
    title: "Posterfolio Vol 2",
    logoText: "POSTERFOLIO",
    category: "Poster Design",
    year: "2025",
    cover: "/projects/posterfolio-vol2-cover.webp",
    preview: {
      kind: "image",
      src: "/projects/posterfolio-vol2-cover.webp",
    },
    cta: "See the Volume",
    role: "Graphic Designer",
    tools: ["Photoshop", "Illustrator", "Figma"],
    description:
      "A volume of six typographic posters on distance, silence and the kinds of hurt that do not announce themselves. Each one carries its own short piece of writing, and the whole set runs on one red, one near-black and a single grey.",
    highlights: [
      "Six posters, each with its own written piece rather than a caption",
      "One red, one near-black and a single grey across the whole volume",
      "Shown in situ: street windows, a lightbox at night, print and a desk",
    ],
    extraFacts: [
      ["Volume", "Six posters"],
      ["Scope", "Typographic poster series"],
      ["Shown", "Print, street and screen mockups"],
    ],
    /*
      The volume is one red on near-black. #d60812 is 5.1:1 on the page's
      own #1c1c1c ground, but only 4.05:1 on white, just under what real
      text needs - so light-mode text drops to #b3060f at 6.2:1 on the
      cream, while `solid` and `bright` keep the true red for the masthead
      and anything meant to be spotted.
    */
    accent: {
      dark: "#ff3b45",
      light: "#b3060f",
      solid: "#d60812",
      bright: "#ff1520",
      ink: "#ffffff",
      fill: "#b3060f",
      hover: "#94050c",
    },
    /* the About beat, written rather than falling back to the description */
    sections: [
      {
        name: "overview",
        blocks: [
          { kind: "statement", text: "The subject is what goes unsaid, so the design holds back and lets the writing carry the weight." },
          {
            kind: "prose",
            body: [
              "The writing is part of each poster rather than a caption under it, so the type has to carry the mood on its own.",
              "Three colours for six posters: one red, one near-black and a single grey. Holding the palette that tight is what makes six separate pieces read as one volume.",
            ],
          },
        ],
      },
    ],
    posterVolume: {
      kicker: "creative posters.",
      label: "volume",
      number: "01",
      entries: [
        {
          no: "01",
          title: "BREAKING YOU",
          body: [
            "Some fractures don't come from impact they form in silence, over time, unnoticed by most but deeply felt by one.",
            "This piece explores the weight of offering warmth into a void, where responses never arrive, but the awareness does.",
            "It's about the quiet unraveling that happens not because someone left, but because they stayed just enough to be seen, yet never close enough to hold anything real.",
            "Not every wound bleeds some just echo.",
          ],
          posters: [
            { src: "/projects/posterfolio-vol2/breaking-you-1.webp", alt: "Breaking You on red, the halftone headline breaking apart across the top." },
            { src: "/projects/posterfolio-vol2/breaking-you-2.webp", alt: "Breaking You on white, the halftone mark in red." },
            { src: "/projects/posterfolio-vol2/breaking-you-3.webp", alt: "Breaking You on black, the halftone mark in red." },
            { src: "/projects/posterfolio-vol2/breaking-you-4.webp", alt: "Breaking You on white, the halftone mark in black." },
          ],
          plates: [
            { src: "/projects/posterfolio-vol2/breaking-you-single.webp", alt: "The Breaking You poster on a dark ribbed wall, red with a distorted repeated headline." },
            { src: "/projects/posterfolio-vol2/breaking-you-street.webp", alt: "Three Breaking You posters side by side in a lit street window, two red and one white." },
          ],
        },
        {
          no: "02",
          title: "CURSED",
          body: [
            "A visual exploration of unseen weight  when it feels like everything touched slowly withers.",
            "Bonds fade, moments decay, even the brightest things begin to dull.",
            "This piece reflects a year spent in shadows, where nothing holds, and everything slips - not with chaos, but with quiet inevitability.",
            "It's less about destruction, more about a presence that carries silence, loss, and the haunting sense that maybe it was never luck that ran out but something deeper that never left.",
          ],
          posters: [
            { src: "/projects/posterfolio-vol2/cursed-1.webp", alt: "Cursed, a figure pressing a hand through fogged glass." },
            { src: "/projects/posterfolio-vol2/cursed-2.webp", alt: "Cursed set small in red on white, reading even the mirror feels unfamiliar now." },
            { src: "/projects/posterfolio-vol2/cursed-3.webp", alt: "Cursed set in white on deep red." },
          ],
          plates: [
            { src: "/projects/posterfolio-vol2/cursed-room.webp", alt: "The Cursed poster in a dark room beside two pale vases, a figure reaching through red." },
            { src: "/projects/posterfolio-vol2/cursed-print.webp", alt: "Cursed as a printed piece lit against a deep red ground." },
          ],
        },
        {
          no: "03",
          title: "SHATTERED BONDS",
          body: [
            "Some ties don't snap all at once they fray in silence, thread by thread, while one side still holds on, unaware the other let go long ago. This piece captures the haunting dissonance between what felt unbreakable and what was never held equally.",
            "Sometimes it's not the end that hurts most  it's the realization that maybe you were the only one who ever believed it wouldn't.",
          ],
          posters: [
            { src: "/projects/posterfolio-vol2/shattered-1.webp", alt: "Shattered Bonds, Stitch the Silence, on white with two figures pulling a thread between them." },
            { src: "/projects/posterfolio-vol2/shattered-2.webp", alt: "Shattered Bonds, Stitch the Silence, on red." },
            { src: "/projects/posterfolio-vol2/shattered-3.webp", alt: "Shattered Bonds, Stitch the Silence, on pale grey." },
          ],
          plates: [
            { src: "/projects/posterfolio-vol2/shattered-print.webp", alt: "Shattered Bonds as a booklet on red, headline reading Stitch the Silence." },
            { src: "/projects/posterfolio-vol2/shattered-desk.webp", alt: "Shattered Bonds framed and standing on a pale desk beside a lamp." },
          ],
        },
        {
          no: "04",
          title: "SUKOON",
          body: [
            "This poster holds a bittersweet truth that sometimes, peace doesn't come in silence, but in the shape of a person.",
            "Not the kind of calm that erases chaos, but the kind that makes it survivable.",
            "A glance, a voice, a quiet presence that makes the weight of everything feel lighter.",
            "Yet within that stillness lives a soft ache the fragile comfort of needing someone just to feel okay.",
            "It's not just love; it's refuge. A breath, a hush, a fleeting home in a world that keeps breaking.",
            "Two people, momentarily, becoming each other's pause in the storm.",
          ],
          posters: [
            { src: "/projects/posterfolio-vol2/sukoon-1.webp", alt: "Sukoon set in English over Hindi, two glowing figures on a horizon." },
            { src: "/projects/posterfolio-vol2/sukoon-2.webp", alt: "Sukoon in English, the two figures against a dark sky." },
            { src: "/projects/posterfolio-vol2/sukoon-3.webp", alt: "Sukoon set in Hindi, the two figures against a dark sky." },
          ],
          plates: [
            { src: "/projects/posterfolio-vol2/sukoon-jungle.webp", alt: "The Sukoon poster standing in wet jungle, two figures silhouetted against a glowing horizon." },
          ],
        },
        {
          no: "05",
          title: "RECIPROCATE",
          body: [
            "This piece explores a quieter kind of hurt not from being ignored, but from being seen and still left unnoticed.",
            "It reflects those who show up with silent effort and unspoken feelings, hoping to be understood, only to be met with deliberate indifference.",
            "Not distance, but closeness that avoids connection.",
            "Sometimes, the loudest quiet echoes from the one soul you whispered toward.",
            "The design speaks through stillness for emotions that were true, yet never acknowledged.",
          ],
          posters: [
            { src: "/projects/posterfolio-vol2/reciprocate-1.webp", alt: "Reciprocate on red, a figure standing with head bowed." },
            { src: "/projects/posterfolio-vol2/reciprocate-2.webp", alt: "Reciprocate on white, the figure in black." },
            { src: "/projects/posterfolio-vol2/reciprocate-3.webp", alt: "Reciprocate on black, the figure in red." },
          ],
          plates: [
            { src: "/projects/posterfolio-vol2/reciprocate-wall.webp", alt: "Four Reciprocate posters along a curved concrete wall, alternating red and white, a figure walking past." },
          ],
        },
        {
          no: "06",
          title: "PEACE",
          body: [
            "Long For Peace is a quiet reflection on stillness a poster where words don't seek answers, only presence.",
            "The poem flows gently, like petals drifting without destination, capturing a kind of peace that arrives without noise or resolution.",
            "It's about the feelings that remain unspoken, the silences that stay, and how something can bloom fully even when unseen.",
            "This piece isn't loud in message it rests, breathes, and simply exists.",
          ],
          posters: [
            { src: "/projects/posterfolio-vol2/peace-1.webp", alt: "Long For Peace on blue, a tulip opening across the sheet." },
            { src: "/projects/posterfolio-vol2/peace-2.webp", alt: "Long For Peace, the bloom filling the frame." },
            { src: "/projects/posterfolio-vol2/peace-3.webp", alt: "Long For Peace laid among real flowers." },
          ],
          plates: [
            { src: "/projects/posterfolio-vol2/peace-night.webp", alt: "Long For Peace glowing as a lightbox at night, a blue bloom against pale type." },
            { src: "/projects/posterfolio-vol2/all-plates.webp", alt: "The whole volume laid out together: Reciprocate, Peace, Breaking You and Cursed overlapping on a dark ground." },
          ],
        },
      ],
    },
  },
];

/*
  The homepage reel's running order, which is an editorial call and not the
  order of the array above. PROJECTS keeps its own order, so /work is
  unaffected.

  Six, in three pairs, and the pairs alternate which side is wide (see the
  ROWS rhythm in SelectedWorks.tsx). Positions 1, 4 and 5 land in the wide
  slot and render about half again as large as the three beside them, so
  reordering changes how big a project is, not only where it sits. Adding
  a seventh would leave it with no row: SelectedWorks throws rather than
  dropping it silently.

  Named by id rather than by position: the reel used to index into PROJECTS
  directly, which meant inserting a project anywhere near the top silently
  reshuffled the homepage.
*/
const SELECTED_IDS = [
  "mike-tyson-invitational",
  "layover",
  "elevation-capital",
  "cat-operator-assistant",
  "cpgrams",
  /* the website Gravitas, not "gravitas-showcase", which is the identity
     piece built on the same fest */
  "gravitas",
];

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
