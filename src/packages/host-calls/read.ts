import { block, bytes, hash, read } from "@typeberry/jam-host-calls";
import { Storage } from "../web-worker/types";

export class ReadAccounts implements read.Accounts {
  constructor(data: Storage) {
    this.data = data;
  }

  public readonly data: Storage = new Map();

  read(_serviceId: block.ServiceId, hash: hash.Blake2bHash): Promise<bytes.BytesBlob | null> {
    console.log(this.data);

    const d = this.data.get(hash.toString());
    if (d === undefined) {
      throw new Error(`Unexpected call to read with ${hash}`);
    }
    return Promise.resolve(d);
  }
}
