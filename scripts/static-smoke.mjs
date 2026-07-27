import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = 4173;
const outputDirectory = join(process.cwd(), "out");
const routes = [
  "/",
  "/buscar/",
  "/producto/?id=mock-003",
  "/carrito/",
  "/checkout/",
  "/pedido-confirmado/",
  "/mis-pedidos/",
  "/admin/",
  "/admin/productos/nuevo/",
  "/admin/pedidos/detalle/?id=order-003",
  "/admin/configuracion/",
];

if (!existsSync(join(outputDirectory, "index.html"))) {
  throw new Error("No existe out/index.html. Ejecuta npm run build primero.");
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url ?? "/", "http://127.0.0.1").pathname,
  );
  const candidatePaths =
    pathname === "/"
      ? ["/index.html"]
      : pathname.endsWith("/")
        ? [`${pathname}index.html`, `${pathname.slice(0, -1)}.html`]
        : [pathname, `${pathname}.html`];
  const filePath = candidatePaths
    .map((candidate) => normalize(join(outputDirectory, candidate)))
    .find((candidate) => candidate.startsWith(outputDirectory) && existsSync(candidate));

  if (!filePath) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const resolvedFile = statSync(filePath).isDirectory()
    ? join(filePath, "index.html")
    : filePath;
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(resolvedFile)] ?? "application/octet-stream",
  });
  createReadStream(resolvedFile).pipe(response);
});

const hardTimeout = setTimeout(() => {
  server.closeAllConnections();
  server.close();
  process.exitCode = 1;
  console.error("El smoke test excedió 20 segundos y fue detenido.");
}, 20_000);

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  for (const route of routes) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      throw new Error(`${route} respondió HTTP ${response.status}.`);
    }
    console.log(`PASS ${route} HTTP ${response.status}`);
  }
} finally {
  clearTimeout(hardTimeout);
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

console.log("PASS servidor estático cerrado correctamente");
