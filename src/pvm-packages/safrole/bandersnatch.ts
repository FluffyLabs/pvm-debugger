import { verify_safrole } from "bandersnatch-wasm/pkg";

export async function verifyBandersnatch(): Promise<boolean> {
  // TODO [ToDr] make it async (run inside a worker)
  return verify_safrole();
}
