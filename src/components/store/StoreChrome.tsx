import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

const navItems = [
  { to: "/produtos", label: "Produtos" },
  { to: "/marcas", label: "Marcas" },
  { to: "/lookbook", label: "Lookbook" },
] as const;

export function StoreHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
        <Link to="/" className="font-display text-xl tracking-tight text-foreground md:text-2xl">
          Casa Branca
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="label-nav text-foreground/80 transition hover:text-foreground"
              activeProps={{ className: "label-nav text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button aria-label="Buscar" className="p-1 text-foreground hover:opacity-70">
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <nav className="flex items-center justify-center gap-6 border-t border-border py-2 md:hidden">
        {navItems.map((n) => (
          <Link key={n.to} to={n.to} className="label-nav text-foreground/80">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function StoreFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-[1400px] px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="font-display text-2xl">Casa Branca</div>
            <div className="mt-2 text-sm text-muted-foreground">Moda autoral. Curadoria de marcas brasileiras.</div>
          </div>
          <div className="label-eyebrow text-muted-foreground">
            © {new Date().getFullYear()} Casa Branca
          </div>
        </div>
      </div>
    </footer>
  );
}
