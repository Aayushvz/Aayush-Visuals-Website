import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROJECTS } from "@/components/projects/projectData";
import FigmaProjectPage from "@/components/projects/figma/FigmaProjectPage";

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
  return {
    title: `${project.title} - Aayush Visuals`,
    description: project.description,
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
