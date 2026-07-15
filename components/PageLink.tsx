"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

/*
  Route link with the site's cinematic page transition: on click the
  current page's <main> lifts upward and fades (html.page-leaving, see
  globals.css), then the route swaps and the incoming page's <main> plays
  its entrance (app/template.tsx). Fixed chrome — navbar, cursor, rails —
  never animates, so navigation reads as content changing inside a
  persistent shell. Falls back to an instant push under reduced motion,
  and never intercepts modified clicks (new-tab etc.).
*/

const LEAVE_MS = 380;

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

export default function PageLink({ href, children, onClick, ...rest }: Props) {
  const router = useRouter();

  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        // same-route hash hops shouldn't play the leave animation
        const [path] = href.split("#");
        if (path === "" || path === window.location.pathname) return;
        e.preventDefault();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          router.push(href);
          return;
        }
        document.documentElement.classList.add("page-leaving");
        window.setTimeout(() => router.push(href), LEAVE_MS);
      }}
    >
      {children}
    </Link>
  );
}
