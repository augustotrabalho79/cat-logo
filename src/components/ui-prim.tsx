import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="label-eyebrow text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground " +
        (props.className ?? "")
      }
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "w-full min-h-24 border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground " +
        (props.className ?? "")
      }
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={
        "w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground " +
        (props.className ?? "")
      }
    />
  );
}

export function Btn({
  variant = "solid",
  className = "",
  ...rest
}: { variant?: "solid" | "outline" | "ghost" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "label-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 transition";
  const variants: Record<string, string> = {
    solid: "bg-foreground text-background hover:opacity-90",
    outline: "border border-foreground text-foreground hover:bg-foreground hover:text-background",
    ghost: "text-foreground hover:bg-muted",
    danger: "border border-[var(--sale)] text-[var(--sale)] hover:bg-[var(--sale)] hover:text-white",
  };
  return <button {...rest} className={`${base} ${variants[variant]} ${className}`} />;
}
