import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getBrands, type Brand } from "@/lib/api";

export const Route = createFileRoute("/_store/marcas/")({
  head: () => ({ meta: [{ title: "Marcas — Casa Branca" }] }),
  component: MarcasPage,
});

function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  useEffect(() => { getBrands().then(setBrands); }, []);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16">
      <div className="label-eyebrow text-muted-foreground">Curadoria</div>
      <h1 className="mt-2 font-display text-5xl">Marcas</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Selecionamos casas autorais cujo trabalho vai além da peça. Conheça quem produz cada coleção.
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {brands.map((b) => (
          <Link
            key={b.id}
            to="/marcas/$slug"
            params={{ slug: b.slug }}
            className="group block fade-in"
          >
            <div
              className="relative flex aspect-[4/3] items-end overflow-hidden p-8 transition"
              style={{ background: `linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor ?? "#fafaf7"})` }}
            >
              <div className="absolute inset-0 bg-foreground/0 transition group-hover:bg-foreground/10" />
              <div className="relative">
                <div className="font-display text-4xl text-background mix-blend-difference">{b.name}</div>
                <div className="label-eyebrow mt-2 text-background/90 mix-blend-difference">{b.tagline}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
