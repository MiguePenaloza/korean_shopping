import type { MockOrder, OrderStatus } from "@/types/order";

export const mockOrders: readonly MockOrder[] = [
  {
    id: "order-001",
    number: "BP-2607-123",
    customerName: "María Fernández",
    phone: "+591 71234567",
    createdAt: "26 julio, 19:42",
    expiresAt: "26 julio, 20:07",
    totalBob: 406,
    status: "payment_reported",
    items: [
      { name: "Relief Sun Rice + Probiotics", quantity: 1, unitPriceBob: 168 },
      { name: "Juicy Lasting Tint", quantity: 2, unitPriceBob: 119 },
    ],
  },
  {
    id: "order-002",
    number: "BP-2607-119",
    customerName: "Carla Rojas",
    phone: "+591 76543210",
    createdAt: "26 julio, 18:20",
    expiresAt: "Confirmado",
    totalBob: 245,
    status: "paid",
    items: [{ name: "The Star Chapter: SANCTUARY", quantity: 1, unitPriceBob: 245 }],
  },
  {
    id: "order-003",
    number: "BP-2507-088",
    customerName: "Lucía Pérez",
    phone: "+591 70001122",
    createdAt: "25 julio, 20:05",
    expiresAt: "25 julio, 20:30",
    totalBob: 168,
    status: "expired",
    items: [{ name: "Relief Sun Rice + Probiotics", quantity: 1, unitPriceBob: 168 }],
  },
];

export const orderStatusCopy: Record<
  OrderStatus,
  { label: string; description: string; variant: "success" | "warning" | "neutral" }
> = {
  awaiting_payment: {
    label: "Esperando pago",
    description: "Solicita el QR y realiza el pago antes del vencimiento.",
    variant: "warning",
  },
  payment_reported: {
    label: "Pago avisado",
    description: "Recibimos tu aviso. El administrador verificará el pago.",
    variant: "warning",
  },
  paid: {
    label: "Pagado",
    description: "Pago verificado. El producto está listo para ser comprado en Corea.",
    variant: "success",
  },
  purchased: {
    label: "Comprado",
    description: "El producto ya fue comprado en Corea.",
    variant: "success",
  },
  delivered: {
    label: "Entregado",
    description: "Pedido entregado.",
    variant: "success",
  },
  expired: {
    label: "Vencido",
    description: "El tiempo de pago terminó. Este pedido requiere revisión.",
    variant: "neutral",
  },
};

export function findMockOrder(id: string | null): MockOrder {
  return (
    mockOrders.find((order) => order.id === id || order.number === id) ?? mockOrders[0]!
  );
}
