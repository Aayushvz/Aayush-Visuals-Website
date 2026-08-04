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
