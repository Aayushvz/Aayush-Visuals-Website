import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROJECTS } from "@/components/projects/projectData";
import FigmaProjectPage from "@/components/projects/figma/FigmaProjectPage";
import { PERSON_NAME } from "@/lib/site";

export async function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.id === slug);
  if (!project) return {};

  const title = `${project.title} — ${project.category}`;
  /* the summary can run long; search snippets cut around 160 characters */
  const description =
    project.description.length > 160
      ? `${project.description.slice(0, 157).trimEnd()}…`
      : project.description;

  return {
    title,
    description,
    alternates: { canonical: `/work/${project.id}` },
    openGraph: {
      type: "article",
      title: `${project.title} — ${PERSON_NAME}`,
      description,
      url: `/work/${project.id}`,
      /* the project's own artwork beats the generic card when a case study
         link is shared directly */
      images: [{ url: project.cover, alt: `${project.title} — case study` }],
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.id === slug);
  if (!project) notFound();

  return <FigmaProjectPage project={project} />;
}
