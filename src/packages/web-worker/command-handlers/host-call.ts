import { HostCallIdentifiers } from "@/types/pvm";
import { CommandStatus, PvmApiInterface, Storage } from "../types";
import { read, write } from "@typeberry/jam-host-calls";
import { WriteAccounts } from "@/packages/host-calls/write";
import { isInternalPvm } from "../utils";
import { ReadAccounts } from "@/packages/host-calls/read";
import { tryAsServiceId } from "@typeberry/block";

type HostCallParams = {
  pvm: PvmApiInterface | null;
  hostCallIdentifier: HostCallIdentifiers;
  storage: Storage | null;
  serviceId: number | null;
};

type HostCallResponse =
  | {
      hostCallIdentifier: Exclude<HostCallIdentifiers, HostCallIdentifiers.WRITE>;
      status: CommandStatus;
      error?: unknown;
    }
  | {
      hostCallIdentifier: HostCallIdentifiers.WRITE;
      storage?: Storage;
      status: CommandStatus;
      error?: unknown;
    };

type ExecuteParams = Parameters<write.Write["execute"]>;
type RegistersType = ExecuteParams[1];
type MemoryType = ExecuteParams[2];

const hostCall = async ({
  pvm,
  hostCallIdentifier,
  storage,
  serviceId,
}: {
  pvm: PvmApiInterface;
  hostCallIdentifier: HostCallIdentifiers;
  storage: Storage;
  serviceId: number;
}): Promise<HostCallResponse> => {
  if (!isInternalPvm(pvm)) {
    return { hostCallIdentifier, status: CommandStatus.ERROR, error: new Error("External PVM not supported") };
  }

  if (hostCallIdentifier === HostCallIdentifiers.READ) {
    const readAccounts = new ReadAccounts(storage);
    const jamHostCall = new read.Read(readAccounts);
    // TODO the types are the same, but exported from different packages and lost track of the type
    jamHostCall.currentServiceId = tryAsServiceId(serviceId) as unknown as typeof jamHostCall.currentServiceId;

    await jamHostCall.execute(
      pvm.getInterpreter().getGasCounter(),
      pvm.getInterpreter().getRegisters() as unknown as RegistersType,
      pvm.getInterpreter().getMemory() as unknown as MemoryType,
    );

    return { hostCallIdentifier, status: CommandStatus.SUCCESS };
  } else if (hostCallIdentifier === HostCallIdentifiers.WRITE) {
    const writeAccounts = new WriteAccounts(storage);
    const jamHostCall = new write.Write(writeAccounts);

    await jamHostCall.execute(
      pvm.getInterpreter().getGasCounter(),
      pvm.getInterpreter().getRegisters() as unknown as RegistersType,
      pvm.getInterpreter().getMemory() as unknown as MemoryType,
    );
    return { hostCallIdentifier, storage, status: CommandStatus.SUCCESS };
  }

  return { hostCallIdentifier, status: CommandStatus.ERROR, error: new Error("Unknown host call identifier") };
};

export const runHostCall = async ({
  pvm,
  hostCallIdentifier,
  storage,
  serviceId,
}: HostCallParams): Promise<HostCallResponse> => {
  if (!pvm) {
    throw new Error("PVM is uninitialized.");
  }

  if (storage === null) {
    throw new Error("Storage is uninitialized.");
  }

  if (serviceId === null) {
    throw new Error("Service ID is uninitialized.");
  }

  try {
    return await hostCall({ pvm, hostCallIdentifier, storage, serviceId });
  } catch (error) {
    return {
      hostCallIdentifier,
      status: CommandStatus.ERROR,
      error: new Error(error instanceof Error ? error.message : "Unknown error"),
    };
  }
};
