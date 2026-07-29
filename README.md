# Belle Perle, Korean Shopping

Aplicación web temporal y mobile-first para vender productos de skincare y K-pop
durante un viaje de compras a Corea.

## Estado

La Fase 10 completa el hardening local: concurrencia real sobre la última unidad,
validación reforzada de comprobantes, encabezados de seguridad, accesibilidad
automatizada, presupuesto de JavaScript y dependencias de producción sin
vulnerabilidades conocidas por `npm audit`.

Consulta [docs/implementation-status.md](docs/implementation-status.md) para conocer
el avance y la siguiente fase autorizable.

## Tecnología

- Next.js 16.2.12 con App Router.
- React 19.2.
- TypeScript estricto.
- Tailwind CSS 4.
- ESLint y Prettier.
- Vitest para pruebas unitarias.
- Exportación HTML estática preparada para Cloudflare Pages.

Supabase se incorporará por fases para PostgreSQL, Auth, Storage, RLS, funciones
seguras y Cron. No habrá un backend Node.js persistente.

## Requisitos locales

- Node.js 24 LTS.
- npm 11 o compatible.
- Git.
- Docker y Supabase CLI a partir de la Fase 3.

## Configuración

1. Copiar `.env.example` como `.env.local`.
2. Copiar la URL y clave pública del entorno local de Supabase.
3. Instalar dependencias con `npm install`.
4. Iniciar el entorno con `npm run dev`.
5. Abrir `http://localhost:3000`.

Variables previstas:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

Nunca se debe añadir una service-role key a una variable `NEXT_PUBLIC_*`.

## Comandos

```text
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run format
npm run format:check
npm run build
npm run smoke:static
npm run quality:static
npm run smoke:auth
npm run smoke:catalogue
npm run smoke:admin-products
npm run smoke:orders
npm run smoke:admin-orders
npm run smoke:tracking
npm run smoke:hardening
npm run db:check
```

`npm run build` produce el sitio estático en `out/`.
`npm run smoke:static` sirve esa carpeta temporalmente, comprueba las rutas
principales con un timeout y cierra el servidor automáticamente.
`npm run quality:static` revisa títulos, idioma, viewport, salto al contenido,
alternativas de imágenes, contraste, foco, movimiento reducido, objetivos táctiles,
encabezados de seguridad y el presupuesto comprimido de JavaScript.
`npm run db:check` valida de forma finita la estructura de migraciones, RLS,
funciones, Storage, Cron y pruebas SQL.
`npm run smoke:auth` requiere `BP_SUPABASE_URL` y
`BP_SUPABASE_PUBLISHABLE_KEY`; crea identidades desechables en la base local y
comprueba la separación entre invitado y cuenta.
`npm run smoke:catalogue` usa las mismas variables para verificar lectura pública,
búsqueda, límites de página y privacidad del inventario.
`npm run smoke:admin-products` requiere además `BP_SUPABASE_SECRET_KEY` únicamente
en la terminal local; verifica la frontera administrativa sin exponer esa clave al
navegador.
`npm run smoke:orders` usa la URL y clave pública locales para comprobar checkout
invitado, idempotencia, propiedad del pedido y el aviso de pago.
`npm run smoke:admin-orders` requiere además `BP_SUPABASE_SECRET_KEY` solamente
para crear un administrador desechable; todas las operaciones bajo prueba usan su
sesión normal y verifican pagos, reembolsos y comprobantes privados.
`npm run smoke:tracking` usa las mismas variables locales para comprobar aislamiento
entre cuentas, exclusión de invitados, cierre de tablas crudas y actualizaciones de
seguimiento.
`npm run smoke:hardening` ejecuta dos checkouts realmente simultáneos sobre la
última unidad y comprueba idempotencia, ventanas 15/25, snapshots de precio y
aislamiento de comprobantes.

## Base de datos y administrador

Las migraciones, políticas RLS, buckets y pruebas pgTAP están en `supabase/`. Para
aplicarlas localmente se requieren Docker y Supabase CLI. El primer administrador
se asigna con `promote_admin_by_email` desde un contexto confiable, según
`docs/deployment.md`. No deben hacerse cambios manuales de esquema que no estén
representados por una migración.

## Despliegue

La preparación y publicación en Cloudflare Pages corresponde a la Fase 11. La
configuración prevista usa:

```text
Build command: npm run build
Output directory: out
```

## Cierre de la campaña

La configuración `ordering_open` ya existe en la base. Al terminar la campaña, el
administrador la establecerá en falso para impedir pedidos nuevos sin borrar el
catálogo ni los pedidos existentes.

## Limitaciones actuales

- La administración y el historial de clientes con cuenta ya usan datos reales.
- Los pedidos de invitados no se vinculan posteriormente por coincidencia de
  teléfono.
- Los documentos visibles de compra y privacidad describen el flujo implementado,
  pero conservan la etiqueta `Versión para revisión legal` hasta una revisión
  profesional previa al lanzamiento.
- Los botones de la confirmación real ya abren WhatsApp con mensajes
  predeterminados.
- El ingreso, registro, recuperación, perfiles, sesión anónima y catálogo público
  ya usan Supabase.
- El checkout ya crea pedidos y reservas reales de 15 minutos; el aviso de pago
  amplía la reserva hasta el minuto 25.
- La carga de imágenes de producto y las acciones administrativas ya persisten
  mediante Storage y RPC seguras.
- El entorno Supabase local fue recreado desde cero y sus 196 comprobaciones pgTAP
  están aprobadas.

## Documentación

- [Requisitos](docs/product-requirements.md)
- [Arquitectura](docs/architecture.md)
- [Base de datos](docs/database.md)
- [Seguridad](docs/security.md)
- [Flujos](docs/user-flows.md)
- [Despliegue](docs/deployment.md)
- [Pruebas manuales](docs/manual-test-checklist.md)
