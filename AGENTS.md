<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Belle Perle project rules

- Work on one approved implementation phase at a time and stop at its review gate.
- Keep every customer-facing message in plain Spanish.
- Keep code, database identifiers, and technical documentation in English.
- Use strict TypeScript and preserve the static Next.js export for Cloudflare Pages.
- Do not introduce a persistent Next.js or Node.js server.
- Never expose secrets or a Supabase service-role key to browser code.
- Never weaken Row Level Security to make a feature work.
- Treat PostgreSQL and secure RPC functions as authoritative for prices, time, inventory, totals, payments, and roles.
- Use `America/La_Paz` for business rules and database time for authoritative expiration.
- Keep dependencies minimal and document why a new dependency is required.
- Preserve accessibility, large touch targets, and mobile-first behavior.
- Do not show raw database errors, stack traces, or private identifiers to customers.
- Run lint, typecheck, tests, and the production build before claiming a phase is complete.
- Update documentation and `docs/implementation-status.md` whenever behavior or architecture changes.
