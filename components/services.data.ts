/*
  The Skills Deck's six cards, in one place.

  Split out of Services.tsx so the homepage can name these files without
  importing the carousel: Services is deliberately code-split and mounted only
  on approach, and importing it to read six strings would drag the whole thing
  back into the main bundle. HomeDeferred hands SERVICE_IMAGES to
  DeferUntilNear's `prefetch`, which starts fetching them before the chunk
  that renders them has even arrived.

  The deck shows twelve cards across six arms - the same six designs, front
  and back - so there are only six files to fetch, not twelve.
*/

export type Service = {
  id: string;
  title: string;
  image: string;
};

export const SERVICES: Service[] = [
  { id: "uiux", title: "UI/UX Design", image: "/services/ui-ux.webp" },
  { id: "graphic", title: "Graphic Design", image: "/services/graphic-design.webp" },
  { id: "brand", title: "Brand Building", image: "/services/brand-building.webp" },
  { id: "video", title: "Video Production", image: "/services/video-production.webp" },
  { id: "website", title: "Website Development", image: "/services/website-development.webp" },
  { id: "product", title: "Product Design", image: "/services/product-design.webp" },
];

export const SERVICE_IMAGES: readonly string[] = SERVICES.map((s) => s.image);
