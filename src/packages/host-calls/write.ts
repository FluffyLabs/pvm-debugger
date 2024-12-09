import { write, hash, block } from "@typeberry/jam-host-calls";
import { BytesBlob } from "@typeberry/pvm-debugger-adapter";

export class WriteAccounts implements write.Accounts {
  constructor(data: Map<hash.Blake2bHash, BytesBlob>) {
    this.data = data;
  }

  public readonly data: Map<hash.Blake2bHash, BytesBlob> = new Map();
  public isFull = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isStorageFull(_serviceId: block.ServiceId): Promise<boolean> {
    return Promise.resolve(this.isFull);
  }

  write(_serviceId: block.ServiceId, hash: hash.Blake2bHash, data: BytesBlob | null): Promise<void> {
    if (data === null) {
      this.data.delete(hash);
    } else {
      this.data.set(hash, data);
    }

    return Promise.resolve();
  }

  readSnapshotLen(): Promise<number> {
    return Promise.resolve(0);
  }
}
