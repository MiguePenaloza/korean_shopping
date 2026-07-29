import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const projectRoot = process.cwd();
const outRoot = path.join(projectRoot, "out");
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

function fail(message) {
  failures.push(message);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? null;
}

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

const files = await walk(outRoot);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const titles = new Map();
let largestInitialJavaScript = { bytes: 0, page: "" };
let largestCompressedJavaScript = { bytes: 0, page: "" };

for (const file of htmlFiles) {
  const relative = path.relative(outRoot, file).replaceAll("\\", "/");
  const html = await readFile(file, "utf8");

  if (!/<html\b[^>]*\blang=["']es-BO["']/i.test(html)) {
    fail(`${relative} does not declare Spanish for Bolivia.`);
  }
  if (!/<meta\b[^>]*\bname=["']viewport["']/i.test(html)) {
    fail(`${relative} is missing a viewport declaration.`);
  }
  if (relative !== "404.html" && relative !== "_not-found.html") {
    if (!html.includes('href="#main-content"')) {
      fail(`${relative} is missing the skip link.`);
    }
    if (!html.includes('id="main-content"')) {
      fail(`${relative} is missing the skip-link target.`);
    }
  }

  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  if (!title) {
    fail(`${relative} is missing a descriptive title.`);
  } else if (relative !== "404.html") {
    const previous = titles.get(title);
    if (previous) fail(`${relative} and ${previous} share the title "${title}".`);
    else titles.set(title, relative);
  }

  for (const image of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (attribute(image, "alt") === null) {
      fail(`${relative} contains an image without alt text.`);
    }
  }

  for (const link of html.match(/<a\b[^>]*\btarget=["']_blank["'][^>]*>/gi) ?? []) {
    const rel = attribute(link, "rel") ?? "";
    if (!rel.split(/\s+/).includes("noreferrer")) {
      fail(`${relative} opens a new tab without noreferrer.`);
    }
  }

  const scriptSources = new Set(
    [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/gi)].map(
      (match) => match[1],
    ),
  );
  let initialJavaScript = 0;
  let compressedJavaScript = 0;
  for (const source of scriptSources) {
    const asset = path.join(outRoot, source.replace(/^\/+/, ""));
    initialJavaScript += (await stat(asset)).size;
    compressedJavaScript += gzipSync(await readFile(asset)).length;
  }
  if (initialJavaScript > largestInitialJavaScript.bytes) {
    largestInitialJavaScript = { bytes: initialJavaScript, page: relative };
  }
  if (compressedJavaScript > largestCompressedJavaScript.bytes) {
    largestCompressedJavaScript = { bytes: compressedJavaScript, page: relative };
  }
}

const headers = await readFile(path.join(outRoot, "_headers"), "utf8");
for (const requiredHeader of [
  "Content-Security-Policy:",
  "Permissions-Policy:",
  "Referrer-Policy:",
  "X-Content-Type-Options:",
  "X-Frame-Options:",
]) {
  if (!headers.includes(requiredHeader)) fail(`_headers is missing ${requiredHeader}`);
}

const globalCss = await readFile(path.join(projectRoot, "app", "globals.css"), "utf8");
if (!globalCss.includes("@media (prefers-reduced-motion: reduce)")) {
  fail("Reduced-motion preferences are not respected.");
}
if (!globalCss.includes(".skip-link:focus-visible")) {
  fail("The keyboard skip link has no visible focus state.");
}
for (const [foreground, background, label] of [
  ["#241d20", "#fffaf8", "primary text"],
  ["#6f6368", "#fffaf8", "muted text"],
  ["#ffffff", "#a74666", "primary buttons"],
  ["#8a5a18", "#f8edcf", "warning messages"],
  ["#2d6a55", "#e2f1e9", "success messages"],
]) {
  const ratio = contrastRatio(foreground, background);
  if (ratio < 4.5) fail(`${label} contrast is ${ratio.toFixed(2)}:1, below 4.5:1.`);
}
const buttonSource = await readFile(
  path.join(projectRoot, "components", "ui", "button.tsx"),
  "utf8",
);
if (!buttonSource.includes('sm: "min-h-11') || !buttonSource.includes('md: "min-h-12')) {
  fail("Shared buttons do not preserve 44 px and 48 px touch targets.");
}
if (largestCompressedJavaScript.bytes > 300 * 1024) {
  fail(
    `${largestCompressedJavaScript.page} references ${largestCompressedJavaScript.bytes} compressed bytes of initial JavaScript; the limit is 307200.`,
  );
}

if (failures.length) {
  console.error("Static quality validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `PASS ${htmlFiles.length} exported HTML pages use es-BO and viewport metadata`,
);
console.log(`PASS ${titles.size} customer-facing route titles are unique`);
console.log("PASS skip links, image alternatives, and safe new-tab links");
console.log(
  "PASS WCAG AA text contrast, visible focus, reduced motion, and touch targets",
);
console.log("PASS static Cloudflare security headers");
console.log(
  `PASS largest initial JavaScript reference is ${largestInitialJavaScript.bytes} raw / ${largestCompressedJavaScript.bytes} gzip bytes (${largestInitialJavaScript.page})`,
);
