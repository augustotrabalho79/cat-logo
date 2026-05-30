/**
 * orderService.ts
 * Serviço de pedidos — criação pública + leitura admin.
 */

import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────

export function formatWhatsAppPhone(phone: string): string {
  // Remove tudo exceto dígitos
  const digits = phone.replace(/\D/g, "");
  // Se já tem código do país (55), retorna como está
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Se tem 10-11 dígitos (DDD + número), adiciona 55
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

// ─── FIRESTORE ────────────────────────────────────────────────────────────────

export async function createOrder(
  data: Omit<Order, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const payload = {
    ...data,
    status: "novo" as OrderStatus,
    source: "catalog" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "orders"), payload);
  return ref.id;
}

export async function getOrders(brandId?: string): Promise<Order[]> {
  const constraints: any[] = [orderBy("createdAt", "desc")];
  if (brandId) constraints.push(where("brandId", "==", brandId));

  const snap = await getDocs(query(collection(db, "orders"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
