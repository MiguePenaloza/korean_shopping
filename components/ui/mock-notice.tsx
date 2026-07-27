export function MockNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-accent/35 bg-accent-soft/60 px-4 py-3 text-sm text-foreground ${className}`}
      role="note"
    >
      <strong>Prototipo visual:</strong> los datos y acciones de esta pantalla son
      simulados. No se enviará información ni se realizará ningún pago.
    </div>
  );
}
