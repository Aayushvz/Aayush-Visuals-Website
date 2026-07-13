import ProjectGrid from "./projects/ProjectGrid";

export default function ProjectsSection() {
  return (
    <section className="projects" id="work">
      <h2 className="display projects__title" data-reveal>
        Curated Projects
      </h2>
      <p className="projects__sub" data-reveal>
        Selection of projects across product design, branding, websites and
        visual systems—crafted with intention and built for real users.
      </p>
      <ProjectGrid />
    </section>
  );
}
