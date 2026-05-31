/**
 * orderService.ts
 * Pedidos — criação pública (anon) + leitura/atualização admin.
 * Backend: Supabase Postgres com RLS.
 */

import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/hooks/use-cart";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "novo"
  | "em_atendimento"
  | "aguardando_pagamento"
  | "pago"
  | "enviado"
  | "concluido"
  | "cancelado";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  enviado: "Enviado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  novo: "bg-blue-100 text-blue-700",
  em_atendimento: "bg-amber-100 text-amber-700",
  aguardando_pagamento: "bg-orange-100 text-orange-700",
  pago: "bg-green-100 text-green-700",
  enviado: "bg-purple-100 text-purple-700",
  concluido: "bg-gray-100 text-gray-700",
  cancelado: "bg-red-100 text-red-500",
};

export type OrderItem = CartItem & { subtotal: number };

export type Order = {
  id: string;
  brandId: string;
  brandName: string;
  customerName: string;
  customerPhone: string;
  observations?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  source: "catalog";
  catalogUrl: string;
  whatsappMessage: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type OrderRow = {
  id: string;
  brand_id: string;
  brand_name: string | null;
  customer_name: string;
  customer_phone: string;
  observations: string | null;
  items: unknown;
  total: number | string;
  status: OrderStatus;
  source: string;
  catalog_url: string | null;
  whatsapp_message: string | null;
  created_at: string;
  updated_at: string;
};

function rowToOrder(r: OrderRow): Order {
  return {
    id: r.id,
    brandId: r.brand_id,
    brandName: r.brand_name ?? "",
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    observations: r.observations ?? undefined,
    items: Array.isArray(r.items) ? (r.items as OrderItem[]) : [],
    total: Number(r.total ?? 0),
    status: r.status,
    source: "catalog",
    catalogUrl: r.catalog_url ?? "",
    whatsappMessage: r.whatsapp_message ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────

export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

export function generateWhatsAppMessage(
  order: Omit<Order, "id" | "status" | "source" | "whatsappMessage" | "createdAt" | "updatedAt">,
): string {
  const itemLines = order.items
    .map((item, i) => {
      const lines = [
        `${i + 1}. ${item.productName}`,
        item.selectedSize ? `   Tamanho: ${item.selectedSize}` : null,
        item.selectedColorName ? `   Cor: ${item.selectedColorName}` : null,
        `   Quantidade: ${item.quantity}`,
        `   Valor unitário: R$ ${item.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        `   Subtotal: R$ ${item.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");

  const total = order.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return `Olá, vim pelo catálogo da ${order.brandName}.

Meu pedido/orçamento:

Cliente: ${order.customerName}
Telefone: ${order.customerPhone}

Produtos:

${itemLines}

Total estimado: R$ ${total}${order.observations ? `\n\nObservações:\n${order.observations}` : ""}

Link do catálogo:
${order.catalogUrl}

Gostaria de confirmar disponibilidade, pagamento e envio.`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const formatted = formatWhatsAppPhone(phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

// ─── SUPABASE ─────────────────────────────────────────────────────────────────

export async function createOrder(
  data: Omit<Order, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const row = {
    brand_id: data.brandId,
    brand_name: data.brandName,
    customer_name: data.customerName,
    customer_phone: data.customerPhone,
    observations: data.observations ?? null,
    items: data.items,
    total: data.total,
    status: "novo" as OrderStatus,
    source: "catalog",
    catalog_url: data.catalogUrl,
    whatsapp_message: data.whatsappMessage,
  };

  const { data: inserted, error } = await supabase
    .from("orders").insert(row).select().single();
  if (error) throw error;
  return inserted.id;
}

export async function getOrders(brandId?: string): Promise<Order[]> {
  let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (brandId) q = q.eq("brand_id", brandId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToOrder);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase
    .from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}
