import { HostCallIdentifiers } from "@/types/pvm";
import { PvmApiInterface, Storage } from "../types";
import { read, write } from "@typeberry/jam-host-calls";
import { WriteAccounts } from "@/packages/host-calls/write";
import { isInternalPvm } from "../utils";
import { ReadAccounts } from "@/packages/host-calls/read";
import { tryAsServiceId } from "@typeberry/block";

type HostCallParams = {
  pvm: PvmApiInterface | null;
  hostCallIdentifier: HostCallIdentifiers;
  storage: Storage | null;
};
type ExecuteParams = Parameters<write.Write["execute"]>;
type RegistersType = ExecuteParams[1];
type MemoryType = ExecuteParams[2];

const hostCall = async ({
  pvm,
  hostCallIdentifier,
  storage,
}: {
  pvm: PvmApiInterface;
  hostCallIdentifier: HostCallIdentifiers;
  storage: Storage;
}) => {
  if (!isInternalPvm(pvm)) {
    return;
  }

  if (hostCallIdentifier === HostCallIdentifiers.READ) {
    const readAccounts = new ReadAccounts(storage);
    const jamHostCall = new read.Read(readAccounts);
    // TODO the types are the same, but exported from different packages and lost track of the type
    jamHostCall.currentServiceId = tryAsServiceId(0x30303030) as unknown as typeof jamHostCall.currentServiceId;

    await jamHostCall.execute(
      pvm.getInterpreter().getGasCounter(),
      pvm.getInterpreter().getRegisters() as unknown as RegistersType,
      pvm.getInterpreter().getMemory() as unknown as MemoryType,
    );
  } else if (hostCallIdentifier === HostCallIdentifiers.WRITE) {
    const writeAccounts = new WriteAccounts(storage);
    const jamHostCall = new write.Write(writeAccounts);

    await jamHostCall.execute(
      pvm.getInterpreter().getGasCounter(),
      pvm.getInterpreter().getRegisters() as unknown as RegistersType,
      pvm.getInterpreter().getMemory() as unknown as MemoryType,
    );
  }
};

export const runHostCall = async ({ pvm, hostCallIdentifier, storage }: HostCallParams): Promise<void> => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  if (storage === null) {
    throw new Error("Storage is uninitialized.");
  }

  return await hostCall({ pvm, hostCallIdentifier, storage });
};