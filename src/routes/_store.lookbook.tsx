import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/lookbook")({
  head: () => ({ meta: [{ title: "Lookbook — Casa Branca" }] }),
  component: Lookbook,
});

const looks = [
  { title: "Manhã Clara", subtitle: "Linho · Marfim · Cobre", grad: "linear-gradient(160deg,#e6e4dd,#d9c7a3)" },
  { title: "Cidade Lenta", subtitle: "Algodão · Caqui · Preto", grad: "linear-gradient(200deg,#8B6914,#0f0f0f)" },
  { title: "Noite Silenciosa", subtitle: "Seda · Marfim · Tinta", grad: "linear-gradient(180deg,#0f0f0f,#3a3a3a)" },
  { title: "Veraneio", subtitle: "Linho · Areia · Branco", grad: "linear-gradient(140deg,#fafaf7,#d9c7a3)" },
];

function Lookbook() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-16 fade-in">
      <div className="label-eyebrow text-muted-foreground">Editorial</div>
      <h1 className="mt-2 font-display text-5xl">Lookbook</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Quatro composições. Quatro estados de espírito. Um vocabulário comum: peças que duram.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {looks.map((l, i) => (
          <div key={i} className="group relative aspect-[4/5] overflow-hidden" style={{ background: l.grad }}>
            <div className="absolute inset-x-0 bottom-0 p-8">
              <div className="label-eyebrow text-background mix-blend-difference">Look {String(i + 1).padStart(2, "0")}</div>
              <div className="mt-2 font-display text-3xl text-background mix-blend-difference">{l.title}</div>
              <div className="label-eyebrow mt-2 text-background/90 mix-blend-difference">{l.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
