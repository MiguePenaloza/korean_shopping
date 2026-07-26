# Belle Perle, Korean Shopping

Aplicación web temporal y mobile-first para vender productos de skincare y K-pop
durante un viaje de compras a Corea.

## Estado

La Fase 1 establece la base local. La aplicación todavía usa datos simulados y no
está conectada a Supabase, WhatsApp, autenticación ni pagos.

Consulta [docs/implementation-status.md](docs/implementation-status.md) para conocer
el avance y la siguiente fase autorizable.

## Tecnología

- Next.js 16.2.11 con App Router.
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
2. Mantener vacías las variables de Supabase durante la Fase 1.
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
```

`npm run build` produce el sitio estático en `out/`.

## Base de datos y administrador

Las migraciones y políticas se crearán en la Fase 3. La autenticación y el
procedimiento documentado para crear el primer administrador llegarán en la Fase 4.
No deben hacerse cambios manuales de esquema que no estén representados por una
migración.

## Despliegue

La preparación y publicación en Cloudflare Pages corresponde a la Fase 11. La
configuración prevista usa:

```text
Build command: npm run build
Output directory: out
```

## Cierre de la campaña

La Fase 3 añadirá una configuración `ordering_open`. Al terminar la campaña, el
administrador la establecerá en falso para impedir pedidos nuevos sin borrar el
catálogo ni los pedidos existentes.

## Limitaciones actuales

- Solo existe la página inicial de fundación.
- Los productos son mocks y los botones no realizan operaciones.
- No hay rutas de producto, carrito, checkout o administración.
- No existe persistencia ni seguridad RLS todavía.
- La identidad visual y los flujos completos se validarán en la Fase 2.

## Documentación

- [Requisitos](docs/product-requirements.md)
- [Arquitectura](docs/architecture.md)
- [Base de datos](docs/database.md)
- [Seguridad](docs/security.md)
- [Flujos](docs/user-flows.md)
- [Despliegue](docs/deployment.md)
- [Pruebas manuales](docs/manual-test-checklist.md)
