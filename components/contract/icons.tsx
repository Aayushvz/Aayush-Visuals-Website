/*
  Inline icon set for /contract, replacing text glyphs (&larr;, &#9662;,
  &times;, +, o/*) with real vector marks.

  24x24 viewBox, 1.5px stroke, fill="none", stroke="currentColor" so every
  icon inherits colour from its control and themes for free across
  .cgShell[data-cg-theme]. Every icon is decorative: aria-hidden and
  focusable="false", because the control around it already carries the
  accessible name. Sizing is left to the .cgIcon class in contract.css,
  never a hardcoded width/height attribute here.

  Only the icons this route actually uses are built here; this is not a
  general icon library.
*/

type IconProps = { className?: string };

function iconClass(className?: string) {
  return className ? `cgIcon ${className}` : "cgIcon";
}

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/* month navigation for DateField's calendar popup */
export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.55 1.55M17.52 17.52l1.55 1.55M2 12h2.2M19.8 12H22M4.93 19.07l1.55-1.55M17.52 6.48l1.55-1.55" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="8" rx="2" />
      <path d="M6 17v4h12v-4" />
    </svg>
  );
}

export function FileTextIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h8M8 9h2" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function RotateCcwIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/* toggles the side panel: a frame with its right column picked out,
   the same mark other tools use for a secondary/inspector sidebar */
export function PanelIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M15 4.5v15" />
    </svg>
  );
}

/*
  Collapse controls for the two docked panels: the same frame-plus-divider
  mark as PanelIcon, with a small chevron pointing further toward the edge
  the panel collapses into. The pair is a mirror of each other (divider and
  chevron on opposite sides) rather than one icon reused with a CSS flip,
  so the SVG itself always reads correctly regardless of how it is placed.
  One icon serves both the collapse and expand state of its control; only
  the button's aria-expanded/aria-label change between the two.
*/
export function PanelCollapseLeftIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9 4.5v15" />
      <path d="M6.5 12h-2m0 0 2-2m-2 2 2 2" />
    </svg>
  );
}

export function PanelCollapseRightIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M15 4.5v15" />
      <path d="M17.5 12h2m0 0-2-2m2 2-2 2" />
    </svg>
  );
}

/*
  One icon per accordion group in FormPanel, mapped by group id rather
  than by array position (see GROUP_ICONS there). Fees & Payment gets a
  generic card mark rather than a currency symbol, since the tool prices
  in INR, USD, EUR and GBP and a dollar sign would misdescribe three of
  the four.
*/

export function PersonIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="4" y="3.5" width="11" height="17" rx="1" />
      <path d="M15 10h5v10.5h-5" />
      <path d="M7.5 7.5h.01M11 7.5h.01M7.5 11h.01M11 11h.01M7.5 14.5h.01M11 14.5h.01" />
    </svg>
  );
}

export function BriefcaseIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

export function CardIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M6 14.5h4" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

export function ScaleIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M12 3v15" />
      <path d="M5 6h14" />
      <path d="M5 6 2 12a3 3 0 0 0 6 0Z" />
      <path d="M19 6l-3 6a3 3 0 0 0 6 0Z" />
      <path d="M8 18h8" />
    </svg>
  );
}

/*
  Footer social marks. Instagram and LinkedIn are simple geometric shapes
  rather than exact brand logos, outline-only so they carry the same
  restrained finish as the rest of the set. Behance is the exception and
  has to be: its mark is a wordmark (Bē), and a geometric approximation of
  a wordmark does not read as the brand - it just reads as a wrong letter.
*/

export function BehanceIcon({ className }: IconProps) {
  /* The official Behance mark. This one is a real brand logo, not a
     geometric stand-in like Instagram/LinkedIn here, so it is filled and
     it is never redrawn by hand - an approximated wordmark stops reading
     as the brand. The transform only insets it to match icon size. */
  return (
    <svg className={iconClass(className)} {...svgProps} fill="currentColor" stroke="none">
      {/* The official Behance mark, used as-is. Only transform here is an
          inset so it optically matches the other icons' size - the path
          itself is the real wordmark and must not be redrawn by hand. */}
      <g transform="scale(0.86) translate(1.95 2.01)">
        <path d="M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z" />
      </g>
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17 7v.01" />
    </svg>
  );
}

export function LinkedInIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 10.5v6M8 7.5v.01" />
      <path d="M12 16.5v-6M12 12.7a2.3 2.3 0 0 1 4.5 0v3.8" />
    </svg>
  );
}
