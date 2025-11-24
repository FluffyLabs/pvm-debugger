import type { Plugin } from "vite";

/**
 * Replaces `import.meta.resolve("./something")` calls with a harmless string literal.
 * @typeberry/lib expects this API in Node, but we only care about browser usage so a fake URL is enough.
 */
export const importMetaResolvePolyfill = (): Plugin => ({
  name: "import-meta-resolve-polyfill",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("@typeberry/lib") || !code.includes("import.meta.resolve")) {
      return null;
    }

    const transformed = code.replace(
      /import\.meta\.resolve\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      (_match, specifier) => `"file:///fake-path/${specifier}"`,
    );

    return transformed === code ? null : { code: transformed, map: null };
  },
});
