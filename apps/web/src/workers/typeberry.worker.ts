import {
  installWorkerEntry,
  TypeberrySyncInterpreter,
} from "@pvmdbg/runtime-worker";

const interpreter = new TypeberrySyncInterpreter();
installWorkerEntry(
  self as unknown as Parameters<typeof installWorkerEntry>[0],
  interpreter,
);
