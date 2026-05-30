import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Tag, Layers, Package, LogOut, Settings2, ChevronLeft, ChevronRight, Users, ShoppingBag } from "lucide-react";
import { signOut, getLowStockCount, getProducts, type Product } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type NavItem = {
  to: "/admin" | "/admin/marcas" | "/admin/categorias" | "/admin/produtos" | "/admin/configuracoes" | "/admin/usuarios" | "/admin/pedidos";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: number;
  adminOnly?: boolean;
};

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const lowStock = getLowStockCount(products);

  const displayEmail = user?.email ?? "";

  // Proteção de rota — redireciona para login se não autenticado
  useEffect(() => {
    if (!loading && !user && pathname !== "/admin/login") {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [user, loading, pathname, navigate]);

  useEffect(() => {
    try {
      const col = localStorage.getItem("admin:sidebar-collapsed");
      if (col === "1") setCollapsed(true);
    } catch {}
    if (user) {
      const brandFilter = isAdmin ? undefined : user.brandId;
      getProducts(brandFilter ? { brandId: brandFilter } : undefined)
        .then(setProducts)
        .catch(console.error);
    }
  }, [user, isAdmin]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("admin:sidebar-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  if (pathname === "/admin/login") return <Outlet />;

  // Mostra loading enquanto verifica auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin border-2 border-border border-t-foreground" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Verificando acesso…</p>
        </div>
      </div>
    );
  }

  // Sem usuário — não renderiza nada (redirect já foi disparado)
  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    try { localStorage.removeItem("admin:email"); } catch {}
    navigate({ to: "/admin/login" });
  }

  const nav: NavItem[] = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/marcas", label: "Marcas", icon: Tag, adminOnly: true },
    { to: "/admin/categorias", label: "Categorias", icon: Layers },
    { to: "/admin/produtos", label: "Produtos", icon: Package, badge: lowStock > 0 ? lowStock : undefined },
    { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
    { to: "/admin/usuarios", label: "Usuários", icon: Users, adminOnly: true },
  ];

  const bottomNav: NavItem[] = [
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings2 },
  ];

  // Filtra itens adminOnly para clientes
  const visibleNav = nav.filter((n) => !n.adminOnly || isAdmin);

  const width = collapsed ? "w-16" : "w-60";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className={`hidden ${width} shrink-0 flex-col border-r border-border md:flex transition-all`}>
        <div className={`flex items-center border-b border-border ${collapsed ? "justify-center px-2 py-5" : "justify-between px-6 py-5"}`}>
          {!collapsed && (
            <div>
              <div className="font-display text-xl">Catálogo</div>
              <div className="label-eyebrow mt-1 text-muted-foreground">
                {isAdmin ? "Super Admin" : "Admin"}
              </div>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="border border-border p-1 hover:border-foreground"
            aria-label={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />}
          </button>
        </div>
        <nav className="flex-1 p-3">
          {visibleNav.map((n) => (
            <NavLink key={n.to} item={n} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>
        <div className="border-t border-border p-3">
          {bottomNav.map((n) => (
            <NavLink key={n.to} item={n} pathname={pathname} collapsed={collapsed} />
          ))}
        </div>
        <div className="border-t border-border p-4">
          {!collapsed && (
            <div>
              <div className="truncate text-xs text-muted-foreground">{displayEmail}</div>
              {isAdmin && (
                <div className="mt-0.5 text-[10px] uppercase tracking-widest text-amber-600">Super Admin</div>
              )}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={`label-btn mt-3 flex w-full items-center justify-center gap-2 border border-border py-2 hover:border-foreground ${collapsed ? "px-0" : ""}`}
            title="Sair"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> {!collapsed && "Sair"}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background md:hidden">
        {[...visibleNav, ...bottomNav].map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-widest ${active ? "text-foreground" : "text-muted-foreground"}`}>
              <n.icon className="h-4 w-4" strokeWidth={1.5} />
              {n.label}
              {n.badge ? (
                <span className="absolute right-2 top-1 bg-[var(--sale)] px-1 text-[9px] font-medium text-white">{n.badge}</span>
              ) : null}
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

function NavLink({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={`label-nav mb-1 flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2.5 transition relative ${
        active ? "bg-foreground text-background" : "text-foreground hover:bg-muted"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {item.badge ? (
        <span className={`bg-[var(--sale)] px-1.5 py-0.5 text-[10px] font-medium text-white ${collapsed ? "absolute right-1 top-1" : ""}`}>
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
