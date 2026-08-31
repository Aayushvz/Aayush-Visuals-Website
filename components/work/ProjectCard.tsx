"use client";

import { motion } from "framer-motion";
import PageLink from "@/components/PageLink";
import { projectCursorProps } from "@/components/projects/ProjectCursor";
import { saveOrigin } from "@/lib/navOrigin";
import type { WorkItem } from "./worksData";
import ProjectMedia from "@/components/projects/ProjectMedia";

/*
  One project card = a white rounded header (title. /year + three macOS dots)
  connected to a large rounded thumbnail.

  The thumbnail is static. It used to blur and scale on hover while a logo
  lockup faded in over it; that preview is gone, so the image the grid shows
  is the image, and the card's only hover state is the dots picking up colour.
  Entrance is a subtle framer fade/rise. The whole card links to the
  project's full case study page.
*/

type Props = {
  item: WorkItem;
  index: number;
};

export default function ProjectCard({ item, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 6) * 0.04 }}
    >
      <PageLink
        className="workCard"
        href={`/work/${item.id}`}
        aria-label={`View ${item.title} project`}
        /* remember this spot so the project's back control returns to the
           grid rather than replaying the hero above it */
        onClick={() => saveOrigin("/work")}
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
          {/* a project whose thumbnail is a loop renders <video> here; see
              ProjectMedia. This was a plain <img>, so a .webm thumbnail
              showed as a broken frame on the works grid. */}
          <ProjectMedia
            className="workCard__img"
            src={item.thumbnail}
            alt={item.title}
            poster={item.poster}
          />
        </div>
      </PageLink>
    </motion.div>
  );
}
