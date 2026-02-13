import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Path to the test fixtures directory
 */
export const FIXTURES_DIR = path.join(__dirname, "..");

/**
 * Get the path to a fixture file
 * @param fileName The name of the fixture file
 * @returns The full path to the fixture file
 */
export function getFixturePath(fileName: string): string {
  return path.join(FIXTURES_DIR, fileName);
}

/**
 * Check if a fixture file exists
 * @param fileName The name of the fixture file
 * @returns True if the fixture exists, false otherwise
 */
export function fixtureExists(fileName: string): boolean {
  const filePath = getFixturePath(fileName);
  return fs.existsSync(filePath);
}

/**
 * Read a fixture file as a string
 * @param fileName The name of the fixture file
 * @returns The file contents as a string
 * @throws Error if the fixture does not exist
 */
export function readFixture(fileName: string): string {
  const filePath = getFixturePath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture not found: ${fileName} at ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Read a fixture file as a Uint8Array
 * @param fileName The name of the fixture file
 * @returns The file contents as a Uint8Array
 * @throws Error if the fixture does not exist
 */
export function readFixtureBytes(fileName: string): Uint8Array {
  const filePath = getFixturePath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture not found: ${fileName} at ${filePath}`);
  }
  return new Uint8Array(fs.readFileSync(filePath));
}

// Common fixture file names
export const FIXTURES = {
  IO_TRACE_OUTPUT: "io-trace-output.log",
} as const;
