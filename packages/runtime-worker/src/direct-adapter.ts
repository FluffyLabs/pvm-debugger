import type { PvmAdapter, AdapterStepResult, MachineStateSnapshot, InitialMachineState, ProgramLoadContext } from "@pvmdbg/types";
import type { SyncPvmInterpreter } from "./adapters/types.js";
import { mapStatus } from "./status-map.js";
import { uint8ToRegs, regsToUint8, validateRegisterIndices, applyRegisterPatch } from "./utils.js";

/**
 * DirectAdapter wraps a SyncPvmInterpreter and exposes the async PvmAdapter interface.
 * Used for Node.js and CLI usage where web workers are not needed.
 */
export class DirectAdapter implements PvmAdapter {
  readonly pvmId: string;
  readonly pvmName: string;

  constructor(
    pvmId: string,
    pvmName: string,
    private readonly interpreter: SyncPvmInterpreter,
  ) {
    this.pvmId = pvmId;
    this.pvmName = pvmName;
  }

  async load(program: Uint8Array, initialState: InitialMachineState, loadContext?: ProgramLoadContext): Promise<void> {
    this.interpreter.load(program, initialState, loadContext);
  }

  async reset(): Promise<void> {
    this.interpreter.reset();
  }

  async step(n: number): Promise<AdapterStepResult> {
    this.interpreter.step(n);
    const statusCode = this.interpreter.getStatus();
    const status = mapStatus(statusCode);
    const result: AdapterStepResult = {
      status,
      pc: this.interpreter.getPc(),
      gas: this.interpreter.getGas(),
    };
    if (status === "host") {
      result.exitArg = this.interpreter.getExitArg();
    }
    return result;
  }

  async getState(): Promise<MachineStateSnapshot> {
    const statusCode = this.interpreter.getStatus();
    return {
      pc: this.interpreter.getPc(),
      gas: this.interpreter.getGas(),
      status: mapStatus(statusCode),
      registers: uint8ToRegs(this.interpreter.getRegisters()),
    };
  }

  async getMemory(address: number, length: number): Promise<Uint8Array> {
    return this.interpreter.getMemory(address, length);
  }

  async setRegisters(regs: Map<number, bigint>): Promise<void> {
    validateRegisterIndices(regs);
    const currentRegs = uint8ToRegs(this.interpreter.getRegisters());
    const patched = applyRegisterPatch(currentRegs, regs);
    this.interpreter.setRegisters(regsToUint8(patched));
  }

  async setPc(pc: number): Promise<void> {
    this.interpreter.setPc(pc);
  }

  async setGas(gas: bigint): Promise<void> {
    this.interpreter.setGas(gas);
  }

  async setMemory(address: number, data: Uint8Array): Promise<void> {
    this.interpreter.setMemory(address, data);
  }

  async shutdown(): Promise<void> {
    this.interpreter.shutdown();
  }
}
