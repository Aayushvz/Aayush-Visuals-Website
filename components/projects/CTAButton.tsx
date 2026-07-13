"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/*
  Shared rounded-pill CTA — reused for the card's hover "View project" reveal
  and the modal's primary action. Renders an <a> when given an href (external
  links always open in a new tab) or a <button> otherwise.
*/

type CommonProps = {
  children: ReactNode;
  variant?: "light" | "solid";
  icon?: ReactNode;
  className?: string;
};

type LinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; onClick?: never };

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

export default function CTAButton(props: LinkProps | ButtonProps) {
  const { children, variant = "solid", icon, className = "", ...rest } = props;
  const cls = `ctaPill ctaPill--${variant} ${className}`.trim();

  if ("href" in rest && rest.href) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
    };
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        {...anchorRest}
      >
        {children}
        {icon}
      </a>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" className={cls} {...buttonRest}>
      {children}
      {icon}
    </button>
  );
}
