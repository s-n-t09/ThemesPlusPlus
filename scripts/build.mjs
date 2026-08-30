import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { transformFile } from "@swc/core";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const pluginRoot = join(root, "src", "plugins", "themes-plus");
const outputRoot = join(root, "dist");
const manifest = JSON.parse(await readFile(join(pluginRoot, "manifest.json"), "utf8"));
const defaultLang = JSON.parse(await readFile(join(root, "lang", "values", "base", "themes_plus.json"), "utf8"));

await rm(outputRoot, { recursive: true, force: true });
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

await build({
  entryPoints: [join(pluginRoot, manifest.main)],
  bundle: true,
  format: "iife",
  supported: {
    "const-and-let": false,
  },
  minifySyntax: true,
  minifyWhitespace: true,
  globalName: "$",
  outfile: join(outputRoot, "index.js"),
  banner: { js: "(()=>{\n\"use strict\";" },
  footer: { js: "return $;})();" },
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
  plugins: [
    aliases,
    vendetta,
    {
      name: "swc",
      setup(api) {
        api.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async args => {
          const result = await transformFile(args.path, {
            jsc: {
              externalHelpers: false,
            },
            env: {
              targets: "fully supports es6",
              include: [
                "transform-block-scoping",
                "transform-classes",
                "transform-async-to-generator",
                "transform-async-generator-functions",
                "transform-named-capturing-groups-regex",
              ],
              exclude: [
                "transform-parameters",
                "transform-template-literals",
                "transform-exponentiation-operator",
                "transform-nullish-coalescing-operator",
                "transform-object-rest-spread",
                "transform-optional-chaining",
                "transform-logical-assignment-operators",
              ],
            },
          });
          return { contents: result.code };
        });
      },
    },
  ],
  logLevel: "info",
});

const built = await readFile(join(outputRoot, "index.js"));
const hash = await crypto.subtle.digest("SHA-256", built);
manifest.main = "index.js";
manifest.hash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(outputRoot, "index.html"), await readFile(join(root, "public", "index.html"), "utf8"));
await writeFile(join(outputRoot, "docs.html"), await readFile(join(root, "public", "docs.html"), "utf8"));
await writeFile(join(outputRoot, "version.json"), `${JSON.stringify({ name: manifest.name, hash: manifest.hash, size: built.byteLength }, null, 2)}\n`);
console.log(`Built ${manifest.name}: ${built.byteLength} bytes`);
