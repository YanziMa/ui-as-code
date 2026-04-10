/**
 * ID generation with prefix support.
 */

let counter = 0;

/** Generate a unique ID with optional prefix */
export function createId(prefix = ""): string {
  counter += 1;
  const id = Date.now().toString(36) + "-" + counter.toString(36);
  return prefix ? `${prefix}_${id}` : id;
}
