/**
 * A function to perform runtime assertions.
 *
 * We avoid using `node:assert` to keep compatibility with a browser environment.
 * Note the checks should not have any side effects, since we might decide
 * to remove all of them in a post-processing step.
 */
export function check(condition: boolean, message?: string): asserts condition is true {
  if (!condition) {
    throw new Error(`Assertion failure: ${message || ""}`);
  }
}
