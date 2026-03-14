/** CLI package metadata. */
export const CLI_NAME = "pvmdbg";
export const CLI_VERSION = "0.0.1";

/** Parse CLI arguments into a structured command. */
export function parseArgs(argv: string[]): { command: string; file?: string } {
  // Skip node and script path
  const args = argv.slice(2);
  const command = args[0] ?? "help";
  const file = args[1];
  return { command, file };
}
