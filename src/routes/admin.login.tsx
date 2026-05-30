import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Field, TextInput, Btn } from "@/components/ui-prim";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      try { localStorage.setItem("admin:email", email); } catch {}
      navigate({ to: user.role === "admin" ? "/admin" : "/" });
    } catch (err: any) {
      console.error("Login error:", err?.code, err?.message);
      const code = err?.code ?? "";
      if (code.includes("INVALID_PASSWORD") || code.includes("EMAIL_NOT_FOUND") || code.includes("INVALID_LOGIN_CREDENTIALS")) {
        setError("E-mail ou senha inválidos.");
      } else if (code.includes("TOO_MANY_ATTEMPTS")) {
        setError("Muitas tentativas. Aguarde alguns minutos.");
      } else if (code.includes("USER_DISABLED")) {
        setError("Usuário desativado.");
      } else {
        setError(`Erro: ${code || err?.message || "desconhecido"}`);
      }
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
            <TextInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </Field>
          <Field label="Senha">
            <TextInput
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        </div>
        {error && (
          <p className="mt-4 text-center text-xs text-red-500">{error}</p>
        )}
        <Btn type="submit" className="mt-8 w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Btn>
      </form>
    </div>
  );
}
