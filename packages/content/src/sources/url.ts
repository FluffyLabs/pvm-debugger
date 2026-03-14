import type { RawPayload } from "../program-envelope.js";

/**
 * Rewrite GitHub blob URLs to raw content URLs.
 * Only GitHub blob URLs are rewritten; all others pass through unchanged.
 */
export function rewriteGitHubBlobUrl(url: string): string {
  const match = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/,
  );
  if (match) {
    const [, owner, repo, rest] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
  }
  return url;
}

/** Fetch bytes from a URL. Rewrites GitHub blob URLs automatically. */
export async function loadUrl(url: string): Promise<RawPayload> {
  const resolvedUrl = rewriteGitHubBlobUrl(url);
  const response = await fetch(resolvedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${resolvedUrl}: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return {
    sourceKind: "url_payload",
    sourceId: url,
    bytes: new Uint8Array(buffer),
  };
}
