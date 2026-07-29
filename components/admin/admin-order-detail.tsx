"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PaymentEvidence } from "@/components/admin/payment-evidence";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  advanceAdminOrderFulfillment,
  attachAdminPaymentEvidence,
  changeAdminOrderState,
  getAdminOrderDetail,
  markAdminOrderPaid,
  orderStatusLabels,
  paymentStatusLabels,
  type AdminOrderAction,
  type AdminOrderDetail as AdminOrderDetailValue,
  type AdminFulfillmentStatus,
} from "@/lib/admin/orders";
import { formatBob } from "@/lib/money/format";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value: string | null) {
  if (!value) return "No registrado";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusVariant(order: AdminOrderDetailValue) {
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") {
    return "success" as const;
  }
  if (
    order.status === "expired" ||
    order.paymentStatus === "payment_reported" ||
    order.paymentStatus === "refund_pending"
  ) {
    return "warning" as const;
  }
  return "neutral" as const;
}

function actionError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    ORDER_REASON_REQUIRED: "Escribe un motivo de al menos 5 caracteres.",
    LATE_PAYMENT_REQUIRES_OVERRIDE:
      "Para aceptar el pago vencido debes escribir un motivo de al menos 10 caracteres.",
    INSUFFICIENT_STOCK:
      "Ya no hay unidades suficientes para aceptar este pago. Sigue el flujo de reembolso.",
    ITEM_UNAVAILABLE:
      "Uno de los productos ya no está disponible. Sigue el flujo de reembolso.",
    PAYMENT_CONFIRMATION_NOT_ALLOWED:
      "El pedido ya no permite confirmar el pago en su estado actual.",
    PAYMENT_REPORT_NOT_ALLOWED: "No se puede registrar otro aviso de pago.",
    PAYMENT_REJECTION_NOT_ALLOWED: "El pago ya no se puede rechazar.",
    ORDER_CANCELLATION_NOT_ALLOWED:
      "Este pedido ya no se puede cancelar como pedido sin pago.",
    REFUND_NOT_ALLOWED: "El pedido no puede iniciar un reembolso desde este estado.",
    REFUND_COMPLETION_NOT_ALLOWED: "Primero registra el pedido como reembolso pendiente.",
    FULFILLMENT_TRANSITION_NOT_ALLOWED:
      "El pedido cambió de estado o todavía no tiene el pago confirmado.",
    INVALID_EVIDENCE_FILE: "El comprobante no tiene un formato o tamaño permitido.",
    INVALID_EVIDENCE_CONTENT:
      "El contenido del comprobante no corresponde a una imagen válida.",
    EVIDENCE_METADATA_MISMATCH:
      "Los datos del archivo no coinciden con el comprobante almacenado.",
    EVIDENCE_UPLOAD_FAILED: "No pudimos subir el comprobante privado.",
  };
  return (
    messages[code] ??
    "No pudimos guardar el cambio. Actualiza el pedido e intenta nuevamente."
  );
}

export function AdminOrderDetail() {
  const params = useSearchParams();
  const orderId = params.get("id") ?? "";
  const validId = uuidPattern.test(orderId);
  const [order, setOrder] = useState<AdminOrderDetailValue | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "missing" | "invalid" | "error"
  >(validId ? "loading" : "invalid");
  const [reason, setReason] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!validId) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    try {
      const result = await getAdminOrderDetail(orderId);
      setOrder(result);
      setStatus(result ? "ready" : "missing");
    } catch {
      setStatus("error");
    }
  }, [orderId, validId]);

  useEffect(() => {
    let active = true;
    if (!validId) return;
    void getAdminOrderDetail(orderId)
      .then((result) => {
        if (!active) return;
        setOrder(result);
        setStatus(result ? "ready" : "missing");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [orderId, validId]);

  const permissions = useMemo(() => {
    if (!order) {
      return {
        report: false,
        paid: false,
        reject: false,
        cancel: false,
        refund: false,
        refunded: false,
      };
    }
    const openOrder = ["pending_payment", "expired"].includes(order.status);
    return {
      report: openOrder && order.paymentStatus === "awaiting_payment",
      paid:
        openOrder &&
        ["awaiting_payment", "payment_reported"].includes(order.paymentStatus),
      reject:
        openOrder &&
        ["awaiting_payment", "payment_reported"].includes(order.paymentStatus),
      cancel: openOrder && order.paymentStatus === "awaiting_payment",
      refund:
        ["pending_payment", "confirmed", "expired", "cancelled"].includes(order.status) &&
        ["payment_reported", "paid"].includes(order.paymentStatus),
      refunded:
        order.status === "refund_pending" && order.paymentStatus === "refund_pending",
    };
  }, [order]);

  const nextFulfillment = useMemo<{
    status: AdminFulfillmentStatus;
    label: string;
    confirmation: string;
  } | null>(() => {
    if (!order || order.paymentStatus !== "paid") return null;
    if (order.status === "confirmed") {
      return {
        status: "purchased",
        label: "Marcar como comprado en Corea",
        confirmation:
          "¿Confirmas que todos los productos de este pedido ya fueron comprados?",
      };
    }
    if (order.status === "purchased") {
      return {
        status: "in_transit",
        label: "Marcar en camino a Bolivia",
        confirmation: "¿Confirmas que este pedido ya está viajando hacia Bolivia?",
      };
    }
    if (order.status === "in_transit") {
      return {
        status: "ready_for_delivery",
        label: "Marcar listo para entregar",
        confirmation:
          "¿Confirmas que este pedido ya está listo para coordinar la entrega?",
      };
    }
    if (order.status === "ready_for_delivery") {
      return {
        status: "delivered",
        label: "Marcar como entregado",
        confirmation: "¿Confirmas que el pedido fue entregado al cliente?",
      };
    }
    return null;
  }, [order]);

  async function runAction(
    action: AdminOrderAction,
    confirmation: string,
    success: string,
  ) {
    if (!order || !window.confirm(confirmation)) return;
    setWorking(action);
    setNotice(null);
    try {
      await changeAdminOrderState(order.id, action, reason);
      setReason("");
      setNotice({ kind: "success", text: success });
      await load();
    } catch (error) {
      setNotice({ kind: "error", text: actionError(error) });
    } finally {
      setWorking("");
    }
  }

  async function advanceFulfillment() {
    if (!order || !nextFulfillment || !window.confirm(nextFulfillment.confirmation)) {
      return;
    }
    setWorking(nextFulfillment.status);
    setNotice(null);
    try {
      await advanceAdminOrderFulfillment(order.id, nextFulfillment.status);
      setNotice({
        kind: "success",
        text: "El estado de seguimiento del cliente fue actualizado.",
      });
      await load();
    } catch (error) {
      setNotice({ kind: "error", text: actionError(error) });
    } finally {
      setWorking("");
    }
  }

  async function confirmPaid() {
    if (!order) return;
    const late = order.status === "expired";
    if (
      !window.confirm(
        late
          ? "¿Confirmas que todavía hay tiempo y stock para aceptar excepcionalmente este pago vencido?"
          : "¿Confirmas que verificaste el pago completo de este pedido?",
      )
    ) {
      return;
    }

    setWorking("paid");
    setNotice(null);
    try {
      await markAdminOrderPaid({
        orderId: order.id,
        acceptLate: late,
        reason,
        file: selectedFile,
      });
      setReason("");
      setSelectedFile(null);
      setNotice({
        kind: "success",
        text: late
          ? "El pago vencido fue aceptado excepcionalmente y quedó auditado."
          : "El pedido fue marcado como pagado.",
      });
      await load();
    } catch (error) {
      setNotice({ kind: "error", text: actionError(error) });
    } finally {
      setWorking("");
    }
  }

  async function uploadSelectedEvidence() {
    if (!order || !selectedFile) return;
    setWorking("evidence");
    setNotice(null);
    try {
      await attachAdminPaymentEvidence(order.id, selectedFile);
      setSelectedFile(null);
      setNotice({
        kind: "success",
        text: "El comprobante quedó adjuntado de forma privada.",
      });
      await load();
    } catch (error) {
      setNotice({ kind: "error", text: actionError(error) });
    } finally {
      setWorking("");
    }
  }

  if (status === "loading") {
    return (
      <p className="text-muted" role="status">
        Cargando pedido…
      </p>
    );
  }

  if (status === "invalid" || status === "missing") {
    return (
      <EmptyState
        title="Pedido no encontrado"
        description="El enlace no corresponde a un pedido disponible para administración."
        action={<ButtonLink href="/admin/pedidos">Volver a pedidos</ButtonLink>}
      />
    );
  }

  if (status === "error" || !order) {
    return (
      <EmptyState
        title="No pudimos cargar el pedido"
        description="Revisa la conexión e intenta nuevamente."
        action={<Button onClick={() => void load()}>Reintentar</Button>}
      />
    );
  }

  const phoneDigits = order.phoneE164.replace(/\D/g, "");
  const needsReason =
    permissions.reject ||
    permissions.cancel ||
    permissions.refund ||
    permissions.refunded ||
    order.status === "expired";

  return (
    <>
      <Link
        className="inline-flex min-h-11 items-center text-sm font-bold text-accent"
        href="/admin/pedidos"
      >
        ← Volver a pedidos
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(order)}>
              {paymentStatusLabels[order.paymentStatus]}
            </Badge>
            <Badge variant="neutral">{orderStatusLabels[order.status]}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-black">{order.number}</h1>
          <p className="mt-1 text-muted">Creado {formatDate(order.createdAt)}</p>
        </div>
        <strong className="text-2xl">{formatBob(order.totalBob)}</strong>
      </div>

      {notice ? (
        <p
          className={`mt-5 rounded-xl p-4 text-sm font-bold ${
            notice.kind === "success"
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning"
          }`}
          role={notice.kind === "success" ? "status" : "alert"}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_23rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-lg font-bold">Cliente</h2>
            <p className="mt-3 font-semibold">{order.customerName}</p>
            <a
              className="mt-1 inline-flex min-h-11 items-center font-bold text-accent"
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noreferrer"
            >
              {order.phoneE164} · Abrir WhatsApp
            </a>
            <p className="mt-2 text-xs text-muted">
              Condiciones y privacidad aceptadas:{" "}
              {order.termsAcceptedAt && order.privacyAcceptedAt ? "Sí" : "No"}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">Productos</h2>
            <div className="mt-4 divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="text-muted">
                      {item.brand} · {item.code}
                      {item.variant ? ` · ${item.variant}` : ""}
                    </p>
                    <p className="text-muted">
                      {item.quantity} unidades × {formatBob(item.unitPriceBob)}
                    </p>
                  </div>
                  <strong>{formatBob(item.lineTotalBob)}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-lg font-bold">Comprobantes privados</h2>
            <p className="mb-4 text-sm leading-6 text-muted">
              Solo las personas administradoras pueden ver estos archivos.
            </p>
            <PaymentEvidence
              evidence={order.evidence}
              selectedFile={selectedFile}
              disabled={Boolean(working)}
              uploading={working === "evidence"}
              onFileChange={setSelectedFile}
              onUpload={() => void uploadSelectedEvidence()}
            />
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">Historial</h2>
            <div className="mt-4 space-y-4">
              {order.history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-accent-soft pl-4 text-sm"
                >
                  <p className="font-bold">
                    {paymentStatusLabels[entry.toPaymentStatus]} ·{" "}
                    {orderStatusLabels[entry.toStatus]}
                  </p>
                  <p className="mt-1 text-muted">
                    {formatDate(entry.createdAt)} · {entry.actorName}
                  </p>
                  {entry.reason ? <p className="mt-1">{entry.reason}</p> : null}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-lg font-bold">Plazos</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted">Reserva actual</dt>
                <dd className="font-bold">{formatDate(order.reservationExpiresAt)}</dd>
              </div>
              <div>
                <dt className="text-muted">Límite tras aviso</dt>
                <dd className="font-bold">{formatDate(order.paymentReportExpiresAt)}</dd>
              </div>
              <div>
                <dt className="text-muted">Pago confirmado</dt>
                <dd className="font-bold">{formatDate(order.paidAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">Acciones del pedido</h2>
            {needsReason ? (
              <div className="mt-4">
                <label htmlFor="admin-order-reason" className="text-sm font-semibold">
                  Motivo de la acción
                </label>
                <textarea
                  id="admin-order-reason"
                  className="mt-2 min-h-28 w-full rounded-xl border border-border bg-surface p-3 text-base focus:border-accent focus:outline-none"
                  value={reason}
                  maxLength={1000}
                  placeholder={
                    order.status === "expired"
                      ? "Explica por qué todavía se puede comprar…"
                      : "Escribe un motivo para el historial…"
                  }
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              {permissions.report ? (
                <Button
                  variant="secondary"
                  disabled={Boolean(working)}
                  onClick={() =>
                    void runAction(
                      "payment_reported",
                      "¿Registrar que el cliente avisó que realizó el pago?",
                      "El aviso de pago quedó registrado.",
                    )
                  }
                >
                  {working === "payment_reported"
                    ? "Registrando…"
                    : "Registrar aviso de pago"}
                </Button>
              ) : null}

              {permissions.paid ? (
                <Button
                  disabled={
                    Boolean(working) ||
                    (order.status === "expired" && reason.trim().length < 10)
                  }
                  onClick={() => void confirmPaid()}
                >
                  {working === "paid"
                    ? "Confirmando…"
                    : order.status === "expired"
                      ? "Aceptar pago vencido excepcionalmente"
                      : "Marcar como pagado"}
                </Button>
              ) : null}

              {permissions.reject ? (
                <Button
                  variant="secondary"
                  disabled={Boolean(working) || reason.trim().length < 5}
                  onClick={() =>
                    void runAction(
                      "reject_payment",
                      "¿Rechazar el pago y liberar la reserva?",
                      "El pago fue rechazado y la reserva quedó liberada.",
                    )
                  }
                >
                  {working === "reject_payment" ? "Rechazando…" : "Rechazar pago"}
                </Button>
              ) : null}

              {permissions.cancel ? (
                <Button
                  variant="secondary"
                  disabled={Boolean(working) || reason.trim().length < 5}
                  onClick={() =>
                    void runAction(
                      "cancel",
                      "¿Cancelar este pedido sin pago?",
                      "El pedido fue cancelado.",
                    )
                  }
                >
                  {working === "cancel" ? "Cancelando…" : "Cancelar pedido"}
                </Button>
              ) : null}

              {permissions.refund ? (
                <Button
                  variant="secondary"
                  disabled={Boolean(working) || reason.trim().length < 5}
                  onClick={() =>
                    void runAction(
                      "refund_pending",
                      "¿Registrar que este pago debe ser devuelto?",
                      "El reembolso quedó pendiente.",
                    )
                  }
                >
                  {working === "refund_pending"
                    ? "Registrando…"
                    : "Registrar reembolso pendiente"}
                </Button>
              ) : null}

              {permissions.refunded ? (
                <Button
                  disabled={Boolean(working) || reason.trim().length < 5}
                  onClick={() =>
                    void runAction(
                      "refunded",
                      "¿Confirmas que ya devolviste el dinero al cliente?",
                      "El pedido quedó marcado como reembolsado.",
                    )
                  }
                >
                  {working === "refunded" ? "Confirmando…" : "Marcar como reembolsado"}
                </Button>
              ) : null}

              {nextFulfillment ? (
                <Button
                  disabled={Boolean(working)}
                  onClick={() => void advanceFulfillment()}
                >
                  {working === nextFulfillment.status
                    ? "Actualizando…"
                    : nextFulfillment.label}
                </Button>
              ) : null}

              {!Object.values(permissions).some(Boolean) && !nextFulfillment ? (
                <p className="rounded-xl bg-surface-soft p-4 text-sm text-muted">
                  No hay acciones disponibles para este estado.
                </p>
              ) : null}
            </div>

            {order.status === "expired" ? (
              <div className="mt-5 rounded-xl bg-warning-soft p-4">
                <p className="text-sm font-bold text-warning">
                  Pedido vencido con posible pago tardío
                </p>
                <p className="mt-1 text-xs leading-5 text-warning">
                  La regla normal es registrar el reembolso. Acepta el pago solo si
                  verificaste que todavía existe stock y tiempo para comprar.
                </p>
              </div>
            ) : null}
          </Card>

          {order.overrides.length ? (
            <Card className="p-5">
              <h2 className="text-lg font-bold">Excepciones registradas</h2>
              <div className="mt-3 space-y-3 text-sm">
                {order.overrides.map((item, index) => (
                  <div key={`${item.createdAt}-${index}`}>
                    <p className="font-bold">Pago vencido aceptado</p>
                    <p>{item.reason}</p>
                    <p className="mt-1 text-xs text-muted">
                      {item.createdByName} · {formatDate(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
