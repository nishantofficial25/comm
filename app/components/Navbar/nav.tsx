// app/components/Navbar/nav.tsx
// Server Component — only the header/container is static HTML.
// NavbarShell handles all pathname-based theming on the client.

import NavbarShell from "./Navbarshell";

export default function Navbar() {
  return (
    <header
      className="bg-white sticky top-0 z-50 border-b border-slate-100"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-20">
        <NavbarShell />
      </div>
    </header>
  );
}
