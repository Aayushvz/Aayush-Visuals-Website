"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

/*
  Route link with the site's page-transition wipe (see
  components/PageTransition.tsx): on click, dispatches a "page-transition"
  event carrying the link's own screen position, so the brand-color circle
  grows from wherever the user actually clicked. PageTransition owns the
  timing, including the real router.push, so the destination route is
  never visible until the circle has fully covered the screen. Falls back
  to an instant push under reduced motion, and never intercepts modified
  clicks (new-tab etc.).
*/

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
        // same-route hash hops shouldn't play the transition
        const [path] = href.split("#");
        if (path === "" || path === window.location.pathname) return;
        e.preventDefault();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          router.push(href);
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        window.dispatchEvent(
          new CustomEvent("page-transition", {
            detail: { href, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          })
        );
      }}
    >
      {children}
    </Link>
  );
}
