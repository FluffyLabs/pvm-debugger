import * as bytes from "@typeberry/lib/bytes";

type BytesBlob = ReturnType<typeof bytes.BytesBlob.blobFrom>;

/**
 * Storage manager that maintains the key-value store across read/write operations.
 * Keys are stored as hex strings for easy comparison.
 */
class StorageManager {
  private storage = new Map<string, Uint8Array>();

  /**
   * Read a value from storage.
   * Returns null if the key doesn't exist.
   */
  read(key: BytesBlob): Uint8Array | null {
    const keyHex = key.toString();
    return this.storage.get(keyHex) ?? null;
  }

  /**
   * Write a value to storage.
   * If value is null, removes the key from storage.
   * Returns the previous value's length, or null if there was no previous value.
   */
  write(key: BytesBlob, value: Uint8Array | null): number | null {
    const keyHex = key.toString();
    const previousValue = this.storage.get(keyHex);
    const previousLength = previousValue ? previousValue.length : null;

    if (value === null) {
      this.storage.delete(keyHex);
    } else {
      this.storage.set(keyHex, new Uint8Array(value));
    }

    return previousLength;
  }

  /**
   * Check if a key exists in storage.
   */
  has(key: BytesBlob): boolean {
    const keyHex = key.toString();
    return this.storage.has(keyHex);
  }

  /**
   * Clear all storage.
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get all keys in storage as hex strings.
   */
  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }
}

// Global singleton instance
export const storageManager = new StorageManager();
