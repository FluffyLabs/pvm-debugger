import { block, bytes, hash, read } from "@typeberry/jam-host-calls";
import { Storage } from "../web-worker/types";

export class ReadAccounts implements read.Accounts {
  constructor(data: Storage) {
    this.data = data;
  }

  public readonly data: Storage = new Map();

  async read(_serviceId: block.ServiceId, hash: hash.Blake2bHash): Promise<bytes.BytesBlob | null> {
    const d = this.data.get(hash.toString());
    if (d === undefined) {
      return null;
    }

    return d;
  }
}
