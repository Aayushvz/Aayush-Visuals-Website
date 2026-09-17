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
