import { useEffect, useState } from "react";
import {
  X, Trash2, Plus, Minus, MessageCircle, ShoppingBag,
  Loader2, ArrowLeft,
} from "lucide-react";
import type { useCart } from "@/hooks/use-cart";
import type { Brand } from "@/lib/api";
import { formatBRL } from "@/lib/api";
import {
  createOrder, generateWhatsAppMessage, buildWhatsAppLink,
  type OrderItem,
} from "@/services/orderService";

type CartDrawerProps = {
  cart: ReturnType<typeof useCart>;
  brand: Brand;
  catalogUrl: string;
};

export function CartDrawer({ cart, brand, catalogUrl }: CartDrawerProps) {
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [waFallbackLink, setWaFallbackLink] = useState<string | null>(null);

  // Reseta o step sempre que o drawer fechar
  useEffect(() => {
    if (!cart.open) {
      setStep("cart");
      setError("");
      setWaFallbackLink(null);
    }
  }, [cart.open]);

  if (!cart.open) return null;

  function handleClose() {
    cart.setOpen(false);
  }

  async function handleFinalize() {
    setError("");
    setWaFallbackLink(null);
    if (!customerName.trim()) { setError("Informe seu nome completo."); return; }
    if (!customerPhone.trim()) { setError("Informe seu telefone ou WhatsApp."); return; }
    if (cart.items.length === 0) { setError("O carrinho está vazio."); return; }
    if (!brand.whatsapp) {
      setError("Esta marca não tem WhatsApp cadastrado. Entre em contato diretamente.");
      return;
    }

    // Calcula mensagem e link ANTES do await — ainda dentro do gesto do usuário
    const orderItems: OrderItem[] = cart.items.map((item) => ({
      ...item,
      subtotal: item.unitPrice * item.quantity,
    }));

    const orderData = {
      brandId: brand.id,
      brandName: brand.name,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      observations: observations.trim() || undefined,
      items: orderItems,
      total: cart.total,
      catalogUrl,
      whatsappMessage: "",
    };

    const message = generateWhatsAppMessage(orderData);
    orderData.whatsappMessage = message;
    const waLink = buildWhatsAppLink(brand.whatsapp, message);

    // Abre aba em branco DENTRO do gesto do usuário (antes de qualquer await).
    // Mobile browsers só permitem window.open em resposta direta ao click.
    const waWindow = window.open("", "_blank");

    setSaving(true);
    try {
      await createOrder({ ...orderData, status: "novo", source: "catalog", whatsappMessage: message });

      // Pedido salvo — redireciona a aba já aberta para o WhatsApp
      if (waWindow) {
        waWindow.location.href = waLink;
      } else {
        // Aba foi bloqueada pelo browser — exibe link manual para o usuário clicar
        setWaFallbackLink(waLink);
      }

      cart.clearCart();
      handleClose();
      setCustomerName("");
      setCustomerPhone("");
      setObservations("");
    } catch (e: any) {
      // Pedido falhou — fecha aba em branco para não deixar tab pendurada
      if (waWindow) waWindow.close();
      setError(`Erro ao enviar pedido: ${e?.message ?? "tente novamente"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl fade-in">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            {step === "checkout" && (
              <button
                onClick={() => { setStep("cart"); setError(""); }}
                className="p-1 hover:opacity-70"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            <h2 className="font-display text-xl">
              {step === "cart" ? "Meu pedido" : "Seus dados"}
            </h2>
            {step === "cart" && cart.count > 0 && (
              <span className="flex h-5 w-5 items-center justify-center bg-foreground text-[10px] font-medium text-background">
                {cart.count}
              </span>
            )}
          </div>
          <button onClick={handleClose} className="p-1 hover:opacity-70" aria-label="Fechar">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {step === "cart" ? (
          /* ── PASSO 1: itens do carrinho ── */
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/30" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">Nenhum produto adicionado</p>
                  <p className="text-xs text-muted-foreground">Clique em um produto para ver detalhes e adicionar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 border-b border-border pb-4 last:border-b-0">
                      {/* Thumb */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden border border-border bg-muted">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                        ) : (
                          <div
                            className="h-full w-full"
                            style={{ background: `linear-gradient(135deg, ${brand.secondaryColor ?? "#e6e4dd"}, ${brand.primaryColor})` }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight line-clamp-2">{item.productName}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                          {item.selectedSize && (
                            <span className="border border-border px-1.5 py-0.5">{item.selectedSize}</span>
                          )}
                          {item.selectedColorName && (
                            <span className="flex items-center gap-1">
                              {item.selectedColor && (
                                <span
                                  className="inline-block h-3 w-3 border border-border"
                                  style={{ background: item.selectedColor }}
                                />
                              )}
                              {item.selectedColorName}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => cart.updateQuantity(idx, item.quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center border border-border hover:border-foreground transition"
                            >
                              <Minus className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <button
                              onClick={() => cart.updateQuantity(idx, item.quantity + 1)}
                              className="flex h-6 w-6 items-center justify-center border border-border hover:border-foreground transition"
                            >
                              <Plus className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{formatBRL(item.unitPrice * item.quantity)}</span>
                            <button
                              onClick={() => cart.removeItem(idx)}
                              className="text-muted-foreground hover:text-red-500 transition"
                              aria-label="Remover item"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="border-t border-border px-5 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total estimado</span>
                  <span className="font-display text-2xl">{formatBRL(cart.total)}</span>
                </div>
                <button
                  onClick={() => setStep("checkout")}
                  className="flex w-full items-center justify-center gap-2 bg-foreground px-4 py-3.5 text-xs font-medium uppercase tracking-widest text-background transition hover:opacity-80"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                  Fazer pedido via WhatsApp
                </button>
              </div>
            )}
          </>
        ) : (
          /* ── PASSO 2: dados do cliente ── */
          <>
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Preencha seus dados para finalizar o pedido de{" "}
                <span className="font-medium text-foreground">{formatBRL(cart.total)}</span>{" "}
                via WhatsApp da <span className="font-medium text-foreground">{brand.name}</span>.
              </p>

              {/* Formulário */}
              <div className="space-y-3">
                <div>
                  <label className="label-eyebrow mb-1.5 block text-muted-foreground">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome"
                    autoFocus
                    className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground transition"
                  />
                </div>
                <div>
                  <label className="label-eyebrow mb-1.5 block text-muted-foreground">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(81) 99999-9999"
                    className="w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground transition"
                  />
                </div>
                <div>
                  <label className="label-eyebrow mb-1.5 block text-muted-foreground">
                    Observações
                  </label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Tamanho, cor, forma de entrega… (opcional)"
                    rows={3}
                    className="w-full resize-none border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground transition"
                  />
                </div>
              </div>

              {/* Resumo do pedido */}
              <div className="border border-border p-4 space-y-2.5">
                <p className="label-eyebrow text-muted-foreground">Resumo do pedido</p>
                {cart.items.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-muted-foreground flex-1 leading-tight">
                      {item.quantity}× {item.productName}
                      {item.selectedSize ? ` · ${item.selectedSize}` : ""}
                      {item.selectedColorName ? ` · ${item.selectedColorName}` : ""}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatBRL(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex items-center justify-between font-medium">
                  <span className="text-sm">Total estimado</span>
                  <span className="font-display text-lg">{formatBRL(cart.total)}</span>
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              {/* Fallback: exibido quando o browser bloqueou a aba do WhatsApp */}
              {waFallbackLink && (
                <a
                  href={waFallbackLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 border border-green-600 px-4 py-3 text-xs font-medium uppercase tracking-widest text-green-600 transition hover:bg-green-50"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                  Toque aqui para abrir o WhatsApp
                </a>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-4 space-y-2">
              <button
                onClick={handleFinalize}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 bg-green-600 px-4 py-3.5 text-xs font-medium uppercase tracking-widest text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {saving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <MessageCircle className="h-4 w-4" strokeWidth={1.5} />}
                {saving ? "Enviando…" : "Confirmar e abrir WhatsApp"}
              </button>
              <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                Seu pedido é registrado automaticamente
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
