import { MEMORY_SPLIT_STEP } from "@/store/utils";

export interface RangeRow {
  id: string;
  start: number;
  length: number;
  isEditing: boolean;
}

export const createEmptyRow = (): RangeRow => ({
  id: crypto.randomUUID(),
  start: 0,
  length: 2 * MEMORY_SPLIT_STEP,
  isEditing: true,
});
