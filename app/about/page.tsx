import type { Metadata } from "next";
import AboutPageClient from "@/components/about/AboutPageClient";
import { OG_IMAGE, PERSON_NAME, ROLE, SITE_URL } from "@/lib/site";

/* bare title — the root layout's template appends " - Aayush Raj" */
const description =
  "Aayush Raj is a product designer and design engineer in India with 5+ years across UI/UX, design systems, brand identity and motion, from national government platforms to global sports brands.";

export const metadata: Metadata = {
  title: "About",
  description,
  keywords: [
    "product designer India",
    "design engineer",
    "UI UX designer portfolio",
    "design systems designer",
    "Aayush Raj",
    "Aayush Visuals",
  ],
  alternates: { canonical: "/about" },
  /* images must be repeated: a child openGraph replaces the parent's rather
     than merging into it, so omitting this ships the page with no share card */
  openGraph: {
    type: "profile",
    title: "About - Aayush Raj",
    description,
    url: "/about",
    images: [OG_IMAGE],
  },
};

/*
  Page-level JSON-LD.

  The root layout already publishes the Person node at `${SITE_URL}/#person`.
  This does NOT restate it — it adds a ProfilePage that points at that same
  @id, plus the facts that only this page evidences (where he studied, what
  he actually does). Because the @id matches, Google merges these properties
  into the one Person entity instead of creating a second, competing one.
*/
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfilePage",
      "@id": `${SITE_URL}/about#page`,
      url: `${SITE_URL}/about`,
      name: `About ${PERSON_NAME}`,
      description,
      inLanguage: "en",
      mainEntity: { "@id": `${SITE_URL}/#person` },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      jobTitle: ROLE,
      knowsAbout: [
        "Product Design",
        "UI/UX Design",
        "Design Systems",
        "User Research",
        "Brand Identity",
        "Motion Design",
        "React",
        "Front-end Development",
      ],
      alumniOf: [
        {
          "@type": "CollegeOrUniversity",
          name: "Vellore Institute of Technology, Vellore",
        },
      ],
      hasCredential: [
        {
          "@type": "EducationalOccupationalCredential",
          name: "Google UX Design Certificate",
          credentialCategory: "certificate",
          recognizedBy: { "@type": "Organization", name: "Google" },
        },
        {
          "@type": "EducationalOccupationalCredential",
          name: "Generative AI",
          credentialCategory: "certificate",
          recognizedBy: { "@type": "Organization", name: "IBM" },
        },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        /* the object is authored here, not user input, so there is nothing to
           sanitize; JSON.stringify already escapes the values */
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AboutPageClient />
    </>
  );
}
