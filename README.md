# Belle Perle, Korean Shopping

Aplicación web temporal y mobile-first para vender productos de skincare y K-pop
durante un viaje de compras a Corea.

## Estado

La Fase 2 contiene el prototipo visual completo para clientes y administración. La
aplicación usa datos e interacciones simuladas y todavía no está conectada a
Supabase, WhatsApp, autenticación ni pagos.

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
2. Mantener vacías las variables de Supabase durante las Fases 1 y 2.
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
```

`npm run build` produce el sitio estático en `out/`.
`npm run smoke:static` sirve esa carpeta temporalmente, comprueba las rutas
principales con un timeout y cierra el servidor automáticamente.

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

- Los productos, pedidos, clientes y tasas son datos simulados.
- Los botones de WhatsApp solo previsualizan el mensaje y no abren la aplicación.
- El ingreso, el checkout, la carga de imágenes y las acciones administrativas no
  persisten cambios.
- No existe persistencia ni seguridad RLS todavía.
- Supabase, migraciones y RLS pertenecen exclusivamente a la Fase 3.

## Documentación

- [Requisitos](docs/product-requirements.md)
- [Arquitectura](docs/architecture.md)
- [Base de datos](docs/database.md)
- [Seguridad](docs/security.md)
- [Flujos](docs/user-flows.md)
- [Despliegue](docs/deployment.md)
- [Pruebas manuales](docs/manual-test-checklist.md)
