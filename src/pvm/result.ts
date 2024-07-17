const createResult = (name: string, code: number) => ({ name, code });

export const HALT = createResult("HALT", 0);
export const PANIC = createResult("PANIC", 2 ** 32 - 12);
export const FAULT = createResult("FAULT", 2 ** 32 - 13);
export const HOST = createResult("HOST", 2 ** 32 - 14);

export type Result = typeof HALT | typeof PANIC | typeof FAULT | typeof HOST;
