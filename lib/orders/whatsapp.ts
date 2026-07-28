import { formatBob } from "@/lib/money/format";

export function requestQrMessage(order: {
  number: string;
  totalBob: number;
  customerName: string;
}) {
  return `Hola, quiero solicitar el QR para pagar y confirmar mi pedido ${order.number}.
Total: ${formatBob(order.totalBob)}.
Nombre: ${order.customerName}.`;
}

export function paymentReportedMessage(order: { number: string; totalBob: number }) {
  return `Hola, ya realicé el pago del pedido ${order.number} por ${formatBob(order.totalBob)}.
Por favor, verifica el pago.`;
}

export function whatsappUrl(phoneE164: string, message: string) {
  const phone = phoneE164.replace(/\D/g, "");
  if (phone.length < 8 || phone.length > 15) {
    throw new Error("INVALID_WHATSAPP_PHONE");
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
