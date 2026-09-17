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
  Footer social marks. Simple geometric shapes rather than exact brand
  logos, still outline-only so they carry the same restrained finish as
  the rest of the set.
*/

export function BehanceIcon({ className }: IconProps) {
  return (
    <svg className={iconClass(className)} {...svgProps}>
      <path d="M3 7h6.5a3 3 0 0 1 0 6H3V7Z" />
      <path d="M3 13h7a3.2 3.2 0 0 1 0 6.4H3V13Z" />
      <path d="M15.5 9.5h5" />
      <path d="M14.7 16.3a3.3 3.3 0 0 0 6.6.4 3.3 3.3 0 0 0-3.2-4c-1.9 0-3.4 1.5-3.4 3.3Z" />
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
