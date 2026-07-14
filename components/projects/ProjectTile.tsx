"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import type { Project } from "./projectData";
import { projectCursorProps } from "./ProjectCursor";
import HoverOverlay from "./HoverOverlay";

/*
  No cards — an editorial grid cell. At rest: wordmark, year, category.
  Nothing else. On hover the cover photo bleeds edge-to-edge (the divider
  is the only spacing), the wordmark shifts black -> white, and the "View
  Project" cursor pill (see ProjectCursor / Cursor.tsx) carries the CTA —
  the tile itself never renders a button.
*/

type Props = {
  project: Project;
  index: number;
  onOpen: (id: string) => void;
};

export default function ProjectTile({ project, index, onOpen }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const imgX = useMotionValue(0);
  const imgY = useMotionValue(0);
  const logoX = useMotionValue(0);
  const logoY = useMotionValue(0);
  const springImgX = useSpring(imgX, { stiffness: 90, damping: 16, mass: 0.5 });
  const springImgY = useSpring(imgY, { stiffness: 90, damping: 16, mass: 0.5 });
  const springLogoX = useSpring(logoX, { stiffness: 90, damping: 16, mass: 0.5 });
  const springLogoY = useSpring(logoY, { stiffness: 90, damping: 16, mass: 0.5 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    imgX.set(px * 12);
    imgY.set(py * 12);
    logoX.set(px * 6);
    logoY.set(py * 6);
  };

  const handleLeave = () => {
    imgX.set(0);
    imgY.set(0);
    logoX.set(0);
    logoY.set(0);
  };

  const open = () => onOpen(project.id);

  return (
    <div
      ref={ref}
      className="projTile"
      data-reveal
      data-project-id={project.id}
      style={{ transitionDelay: `${Math.min(index, 5) * 80}ms` }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={open}
      role="button"
      tabIndex={0}
      aria-label={`View ${project.title} project`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      {...projectCursorProps}
    >
      <HoverOverlay
        src={project.cover}
        videoSrc={project.bgVideoUrl}
        alt=""
        x={reduce ? undefined : springImgX}
        y={reduce ? undefined : springImgY}
      />

      <span className="projTile__year">{project.year}</span>

      {project.logoUrl ? (
        <motion.div
          className="projTile__logoWrapper"
          style={reduce ? undefined : { x: springLogoX, y: springLogoY }}
        >
          <img
            src={project.logoUrl}
            alt={`${project.title} logo`}
            className="projTile__logoImg"
          />
        </motion.div>
      ) : (
        <motion.div
          className="projTile__logoWrapper"
          style={reduce ? undefined : { x: springLogoX, y: springLogoY }}
        >
          <span className="projTile__logo display">
            {project.logoText}
          </span>
        </motion.div>
      )}

      <span className="projTile__category">{project.category}</span>
    </div>
  );
}
