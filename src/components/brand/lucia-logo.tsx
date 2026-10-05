// Logo de LUCIA (spec 05, Hito 3.5): ojo cuyo iris es una burbuja de chat.
// Los colores salen de los tokens de globals.css; la versión estática está en public/brand/.
import { cn } from "@/lib/utils";

type Tone = "brand" | "white";

/** Isotipo. `tone="white"` es la variante monocromo para fondos azules. */
export function LuciaMark({ tone = "brand", className, title }: { tone?: Tone; className?: string; title?: string }) {
  const white = tone === "white";
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path
        d="M2.5 16C6.4 9.4 10.9 6.4 16 6.4S25.6 9.4 29.5 16C25.6 22.6 21.1 25.6 16 25.6S6.4 22.6 2.5 16Z"
        className={white ? "fill-transparent stroke-white" : "fill-card stroke-primary"}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <path d="M16 9.6a6.2 6.2 0 1 1-3.9 11l-2.9 1.3 1-3A6.2 6.2 0 0 1 16 9.6Z" className={white ? "fill-white" : "fill-brand-accent"} />
      <circle cx="16" cy="15.8" r="4.1" className={white ? "fill-white" : "fill-primary"} />
      <circle cx="16" cy="15.8" r="1.8" className={white ? "fill-primary" : "fill-white"} />
      <circle cx="18.6" cy="13.2" r="0.9" className={white ? "fill-primary" : "fill-white"} />
    </svg>
  );
}

/** Logo completo: isotipo + "LUCIA" (+ bajada opcional). */
export function LuciaLogo({ tone = "brand", tagline, className }: { tone?: Tone; tagline?: string; className?: string }) {
  const white = tone === "white";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LuciaMark tone={tone} className="size-9" />
      <div className="leading-tight">
        <p className={cn("text-lg font-bold tracking-[0.18em]", white ? "text-white" : "text-primary")}>LUCIA</p>
        {tagline && <p className={cn("text-xs", white ? "text-white/85" : "text-muted-foreground")}>{tagline}</p>}
      </div>
    </div>
  );
}
