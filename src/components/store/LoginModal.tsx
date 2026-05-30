import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setEmail(""); setPassword(""); setLoading(false); setError("");
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const u = await login(email, password);
      onClose();
      navigate({ to: u.role === "admin" ? "/admin" : "/" });
    } catch {
      setError("Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md border border-border bg-background p-8 fade-in rounded-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="font-display text-2xl">Acesso restrito</h2>
          <button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Área exclusiva para vendedores e administradores</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="label-eyebrow text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-none border border-border bg-background px-3 py-2.5 text-sm"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="label-eyebrow text-muted-foreground">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-none border border-border bg-background px-3 py-2.5 text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="label-btn w-full rounded-none bg-foreground py-3 text-background hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
