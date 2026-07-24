"use client";

import { motion } from "framer-motion";
import { projectCursorProps } from "@/components/projects/ProjectCursor";
import type { WorkItem } from "./worksData";

/*
  One project card = a white rounded header (title. /year + three macOS dots)
  connected to a large rounded image with a centred, always-sharp wordmark.
  All hover behaviour (image blur + scale, dots grey -> red/yellow/green,
  wordmark rising to full) is pure CSS keyed off `.workCard:hover`, so nothing
  runs on mousemove. Entrance is a subtle framer fade/rise for filter changes.
*/

type Props = {
  item: WorkItem;
  index: number;
  onOpen: (id: string) => void;
};

export default function ProjectCard({ item, index, onOpen }: Props) {
  const open = () => onOpen(item.id);

  return (
    <motion.article
      className="workCard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 6) * 0.04 }}
      role="button"
      tabIndex={0}
      aria-label={`View ${item.title} project`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      {...projectCursorProps}
    >
      <div className="workCard__header">
        <span className="workCard__label">
          <span className="workCard__title">{item.title}.</span>
          <span className="workCard__year">/{item.year}</span>
        </span>
        <span className="workCard__dots" aria-hidden>
          <i className="workCard__dot" />
          <i className="workCard__dot" />
          <i className="workCard__dot" />
        </span>
      </div>

      <div className="workCard__media">
        <img
          className="workCard__img"
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          draggable={false}
        />
        <span className="workCard__logoWrap">
          {item.logo ? (
            <img
              className="workCard__logo"
              src={item.logo}
              alt={`${item.title} logo`}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <span className="workCard__wordmark">{item.wordmark}</span>
          )}
        </span>
      </div>
    </motion.article>
  );
}
