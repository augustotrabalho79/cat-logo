import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "@/lib/api";
import { Field, TextInput, Btn } from "@/components/ui-prim";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Acesso restrito — Admin" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      try { localStorage.setItem("admin:email", email); } catch {}
      navigate({ to: "/admin" });
    } catch {
      setError("E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm fade-in">
        <div className="text-center">
          <div className="font-display text-3xl">Casa Branca</div>
          <div className="label-eyebrow mt-3 text-muted-foreground">Acesso restrito</div>
        </div>
        <div className="mt-10 space-y-5">
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </Field>
          <Field label="Senha">
            <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
        </div>
        {error && <p className="mt-4 text-center text-xs text-red-500">{error}</p>}
        <Btn type="submit" className="mt-8 w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Btn>
      </form>
    </div>
  );
}
