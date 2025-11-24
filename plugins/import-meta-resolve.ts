import { readFile } from "node:fs/promises";
import type { Plugin as EsbuildPlugin } from "esbuild";
import type { Plugin as VitePlugin } from "vite";

const TARGET_MODULE = "@typeberry/lib";
const IMPORT_META_MARKER = "import.meta.resolve";
const NEW_URL_CALL =
  /new URL\(\s*import\.meta\.resolve\s*\(\s*(['"`])([^'"`]+)\1\s*\)\s*(?:,\s*import\.meta\.url\s*)?\)/g;
const IMPORT_META_CALL = /import\.meta\.resolve\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
const VOIDED_NEW_URL_CALL = /new URL\(\(void 0\)\(\s*(['"`])([^'"`]+)\1\s*\)\)/g;
const VOIDED_CALL = /\(void 0\)\(\s*(['"`])([^'"`]+)\1\s*\)/g;

const toFakeFileUrl = (specifier: string) => JSON.stringify(`file:///fake-path/${specifier}`);

const rewriteImportMetaResolve = (code: string): string | null => {
  if (!code.includes(IMPORT_META_MARKER)) {
    return null;
  }

  const replacedUrlCalls = code.replace(NEW_URL_CALL, (_match, _quote, specifier) => toFakeFileUrl(specifier));
  const replacedStandalone = replacedUrlCalls.replace(IMPORT_META_CALL, (_match, _quote, specifier) => {
    return toFakeFileUrl(specifier);
  });

  return replacedStandalone === code ? null : replacedStandalone;
};

export const importMetaResolvePolyfill = (): VitePlugin => ({
  name: "import-meta-resolve-polyfill",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes(TARGET_MODULE)) {
      return null;
    }

    const transformed = rewriteImportMetaResolve(code);
    return transformed === null ? null : { code: transformed, map: null };
  },
  renderChunk(code) {
    if (!code.includes("(void 0)(")) {
      return null;
    }

    const patched = code
      .replace(VOIDED_NEW_URL_CALL, (_match, _quote, specifier) => `new URL(${toFakeFileUrl(specifier)})`)
      .replace(VOIDED_CALL, (_match, _quote, specifier) => toFakeFileUrl(specifier));

    return patched === code ? null : patched;
  },
});

export const importMetaResolveEsbuildPlugin = (): EsbuildPlugin => ({
  name: "import-meta-resolve-polyfill",
  setup(build) {
    build.onLoad({ filter: /@typeberry\/lib\/.*\.(mjs|js)$/ }, async (args) => {
      const source = await readFile(args.path, "utf8");
      const transformed = rewriteImportMetaResolve(source);
      return {
        contents: transformed ?? source,
        loader: "js",
      };
    });
  },
});

export const importMetaResolveVitestPlugin = importMetaResolvePolyfill;
