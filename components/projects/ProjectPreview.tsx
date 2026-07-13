"use client";

import type { ProjectPreview as ProjectPreviewData } from "./projectData";

/*
  Renders the correct modal preview surface for a project's tagged-union
  `preview.kind` — behance / website / image / video / page — without the
  modal (or any future case-study page) needing to know the difference.
  Embeds (Behance) only render once `mounted` is true, so nothing loads
  until the modal is actually open.
*/

type Props = {
  preview: ProjectPreviewData;
  title: string;
  mounted: boolean;
};

export default function ProjectPreview({ preview, title, mounted }: Props) {
  switch (preview.kind) {
    case "behance":
      return (
        <div className="projPreview projPreview--behance">
          {mounted ? (
            <iframe
              src={`https://www.behance.net/embed/project/${preview.embedId}?ilo0=1`}
              title={`${title} — Behance embed`}
              allowFullScreen
              loading="lazy"
              frameBorder={0}
              allow="clipboard-write"
            />
          ) : (
            <div className="projPreview__skeleton" aria-hidden />
          )}
        </div>
      );

    case "website":
      return (
        <div className="projPreview projPreview--website">
          {preview.image ? (
            <img src={preview.image} alt={`${title} — live site preview`} loading="lazy" />
          ) : (
            <div className="projPreview__placeholder">
              <span className="projPreview__placeholderLabel">Live site</span>
              <span className="projPreview__placeholderUrl">
                {preview.href.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
            </div>
          )}
        </div>
      );

    case "image":
      return (
        <div className="projPreview projPreview--image">
          <img src={preview.src} alt={title} loading="lazy" />
        </div>
      );

    case "video":
      return (
        <div className="projPreview projPreview--video">
          {mounted && (
            <video src={preview.src} poster={preview.poster} controls playsInline />
          )}
        </div>
      );

    case "page":
      return (
        <div className="projPreview projPreview--placeholder">
          <span className="projPreview__placeholderLabel">Case study coming soon</span>
        </div>
      );

    default:
      return null;
  }
}
