import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseConfig } from "@/lib/firebase";
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
      // Tenta Firebase SDK primeiro (necessário para Firestore Rules)
      const user = await login(email, password);
      localStorage.setItem("admin:email", email);
      navigate({ to: user.role === "admin" ? "/admin" : "/admin" });
    } catch (sdkErr: any) {
      const sdkCode = sdkErr?.code ?? "";

      if (
        sdkCode === "auth/invalid-credential" ||
        sdkCode === "auth/wrong-password" ||
        sdkCode === "auth/user-not-found"
      ) {
        setError("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }

      if (sdkCode === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos.");
        setLoading(false);
        return;
      }

      // SDK falhou por network — tenta REST como fallback
      try {
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          const code = data?.error?.message ?? "";
          if (code.includes("INVALID") || code.includes("NOT_FOUND")) {
            setError("E-mail ou senha inválidos.");
          } else {
            setError(`Erro: ${code || "desconhecido"}`);
          }
          setLoading(false);
          return;
        }

        // REST funcionou — salva sessão e redireciona
        localStorage.setItem("admin:email", email);
        localStorage.setItem("admin:uid", data.localId);
        localStorage.setItem("admin:token", data.idToken);
        navigate({ to: "/admin" });
      } catch (restErr: any) {
        setError("Sem conexão com o servidor. Verifique sua internet.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm fade-in">
        <div className="text-center">
          <div className="font-display text-3xl">Catálogo</div>
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
              autoComplete="email"
            />
          </Field>
          <Field label="Senha">
            <TextInput
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
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
