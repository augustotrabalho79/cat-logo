import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StoreHeader, StoreFooter } from "@/components/store/StoreChrome";

export const Route = createFileRoute("/_store")({
  component: StoreLayout,
});

function StoreLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StoreHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <StoreFooter />
    </div>
  );
}
