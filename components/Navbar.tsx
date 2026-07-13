const links = [
  { label: "Home", href: "#top", current: true },
  { label: "About", href: "#about", current: false },
  { label: "Works", href: "#work", current: false },
  { label: "Contact Us", href: "#contact", current: false },
];

export default function Navbar() {
  return (
    <header className="navbar">
      <a href="#top" className="navbar__logo">
        aayush<sup>vz</sup>
      </a>
      <nav className="navbar__links" aria-label="Primary">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            aria-current={l.current ? "page" : undefined}
          >
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
