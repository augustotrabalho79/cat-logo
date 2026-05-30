import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Tag, Layers, Package, LogOut } from "lucide-react";
import { signOut } from "@/lib/api";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type NavItem = { to: "/admin" | "/admin/marcas" | "/admin/categorias" | "/admin/produtos"; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/marcas", label: "Marcas", icon: Tag },
  { to: "/admin/categorias", label: "Categorias", icon: Layers },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@casabranca.com");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin:email");
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  if (pathname === "/admin/login") {
    return <Outlet />;
  }

  async function handleSignOut() {
    await signOut();
    try { localStorage.removeItem("admin:email"); } catch {}
    navigate({ to: "/admin/login" });
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
        <div className="border-b border-border px-6 py-5">
          <div className="font-display text-xl">Casa Branca</div>
          <div className="label-eyebrow mt-1 text-muted-foreground">Admin</div>
        </div>
        <nav className="flex-1 p-3">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`label-nav mb-1 flex items-center gap-3 px-3 py-2.5 transition ${
                  active ? "bg-foreground text-background" : "text-foreground hover:bg-muted"
                }`}
              >
                <n.icon className="h-4 w-4" strokeWidth={1.5} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="truncate text-xs text-muted-foreground">{email}</div>
          <button onClick={handleSignOut} className="label-btn mt-3 flex w-full items-center justify-center gap-2 border border-border py-2 hover:border-foreground">
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sair
          </button>
        </div>
      </aside>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background md:hidden">
        {nav.map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-widest ${active ? "text-foreground" : "text-muted-foreground"}`}>
              <n.icon className="h-4 w-4" strokeWidth={1.5} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 overflow-x-hidden pb-24 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
