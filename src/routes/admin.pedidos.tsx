import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOrders, updateOrderStatus,
  ORDER_STATUS_LABEL, ORDER_STATUS_COLOR,
  buildWhatsAppLink,
  type Order, type OrderStatus,
} from "@/services/orderService";
import { formatBRL } from "@/lib/api";

export const Route = createFileRoute("/admin/pedidos")({
  component: PedidosPage,
});

const STATUS_OPTIONS: OrderStatus[] = [
  "novo", "em_atendimento", "aguardando_pagamento", "pago", "enviado", "concluido", "cancelado",
];

function PedidosPage() {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const brandId = isAdmin ? undefined : user?.brandId;
      const data = await getOrders(brandId);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = statusFilter ? orders.filter((o) => o.status === statusFilter) : orders;

  function fmtDate(ts: unknown): string {
    if (!ts) return "—";
    try {
      const d = (ts as any).toDate ? (ts as any).toDate() : new Date(ts as string);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return "—"; }
  }

  return (
    <div className="p-6 md:p-10 fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="label-eyebrow text-muted-foreground">Gestão</p>
          <h1 className="mt-1 font-display text-4xl">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Todos os pedidos recebidos pelas marcas."
              : "Pedidos recebidos pelo seu catálogo."}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="label-btn inline-flex items-center gap-2 border border-border px-4 py-2 hover:border-foreground disabled:opacity-50 self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Atualizar
        </button>
      </div>

      {/* Filtros de status */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("")}
          className={`label-btn px-3 py-1.5 text-xs transition ${!statusFilter ? "bg-foreground text-background" : "border border-border hover:border-foreground"}`}
        >
          Todos ({orders.length})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = orders.filter((o) => o.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`label-btn px-3 py-1.5 text-xs transition ${statusFilter === s ? "bg-foreground text-background" : "border border-border hover:border-foreground"}`}
            >
              {ORDER_STATUS_LABEL[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 border border-border shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="font-display text-2xl text-muted-foreground">
            {statusFilter ? "Nenhum pedido com esse status" : "Nenhum pedido ainda"}
          </p>
          {statusFilter ? (
            <button
              onClick={() => setStatusFilter("")}
              className="mt-4 text-xs uppercase tracking-widest underline underline-offset-4"
            >
              Ver todos
            </button>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Os pedidos aparecem aqui quando clientes finalizam pelo catálogo.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden md:block border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="label-eyebrow text-left text-muted-foreground">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Itens</th>
                  {isAdmin && <th className="px-5 py-3">Marca</th>}
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition"
                  >
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-muted-foreground">{order.brandName}</td>
                    )}
                    <td className="px-5 py-3">
                      <span className="font-display">{formatBRL(order.total)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        disabled={updatingId === order.id}
                        className={`label-eyebrow cursor-pointer border-0 bg-transparent text-xs outline-none rounded px-2 py-1 ${ORDER_STATUS_COLOR[order.status]} disabled:opacity-60`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <a
                        href={buildWhatsAppLink(order.customerPhone, order.whatsappMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir WhatsApp do cliente"
                        className="label-btn inline-flex items-center gap-1.5 border border-border px-3 py-1.5 hover:border-green-500 hover:text-green-600 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-4">
            {filtered.map((order) => (
              <div key={order.id} className="border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    {isAdmin && (
                      <p className="text-xs text-muted-foreground mt-0.5">Marca: {order.brandName}</p>
                    )}
                  </div>
                  <span className="font-display text-lg shrink-0">{formatBRL(order.total)}</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {fmtDate(order.createdAt)}
                </p>

                {order.observations && (
                  <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 italic line-clamp-2">
                    {order.observations}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    disabled={updatingId === order.id}
                    className="label-eyebrow flex-1 border border-border bg-background px-2 py-1.5 text-xs outline-none cursor-pointer disabled:opacity-60"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <a
                    href={buildWhatsAppLink(order.customerPhone, order.whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-btn inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs hover:border-green-500 hover:text-green-600 transition"
                  >
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
