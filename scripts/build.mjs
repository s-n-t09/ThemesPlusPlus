import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const pluginRoot = join(root, "src", "plugins", "themes-plus");
const outputRoot = join(root, "dist");
const manifest = JSON.parse(await readFile(join(pluginRoot, "manifest.json"), "utf8"));
const defaultLang = JSON.parse(await readFile(join(root, "lang", "values", "base", "themes_plus.json"), "utf8"));

await mkdir(outputRoot, { recursive: true });

const vendetta = {
  name: "vendetta-runtime",
  setup(api) {
    api.onResolve({ filter: new RegExp("^@vendetta(?:/|$)") }, ({ path }) => ({ path, namespace: "vendetta" }));
    api.onLoad({ filter: /.*/, namespace: "vendetta" }, ({ path }) => ({
      contents: `module.exports = ${path.replace(/^@/, "").replaceAll("/", ".")};`,
      loader: "js",
    }));
  },
};

function resolveSource(path) {
  const base = join(root, "src", "stuff", path.slice(2));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.json`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find(candidate => existsSync(candidate)) ?? base;
}

const aliases = {
  name: "themes-plus-aliases",
  setup(api) {
    api.onResolve({ filter: /^\$\// }, ({ path }) => ({ path: resolveSource(path) }));
  },
};

const migration = join(root, "scripts", "build", "migration-shim.ts");
await build({
  entryPoints: [join(pluginRoot, manifest.main)],
  bundle: true,
  format: "iife",
  globalName: "$",
  outfile: join(outputRoot, "Themes++.js"),
  banner: { js: "(()=>{" },
  footer: { js: "return $;})();" },
  inject: [migration],
  jsxFactory: "React.createElement",
  define: {
    IS_DEV: "false",
    PREVIEW_LANG: "false",
    DEFAULT_LANG: JSON.stringify(defaultLang),
    DEV_LANG: "undefined",
    PLUGINS_LIST: JSON.stringify(["themes-plus"]),
  },
  loader: {
    ".png": "dataurl",
    ".json": "json",
  },
  plugins: [aliases, vendetta],
  logLevel: "info",
});

const built = await readFile(join(outputRoot, "Themes++.js"));
const hash = await crypto.subtle.digest("SHA-256", built);
manifest.main = "Themes++.js";
manifest.hash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(outputRoot, "install.js"), built);
await writeFile(join(outputRoot, "index.html"), await readFile(join(root, "public", "index.html"), "utf8"));
await writeFile(join(outputRoot, "version.json"), `${JSON.stringify({ name: manifest.name, hash: manifest.hash, size: built.byteLength }, null, 2)}\n`);
console.log(`Built ${manifest.name}: ${built.byteLength} bytes`);
