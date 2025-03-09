import { Status } from "@/types/pvm";

export const getStatusColor = (status?: Status) => {
  if (status === Status.OK) {
    return "text-brand-dark bg-brand-light dark:bg-brand/15 dark:border dark:border-brand dark:text-brand";
  }

  if (status === Status.HALT || status === Status.HOST) {
    return "bg-[#FFFDCF] text-[#D0A21D] dark:bg-[#D0A21D]/20 dark:border dark:border-[#FFFDCF] dark:text-[#FFFDCF]";
  }

  if (status === Status.PANIC) {
    return "text-destructive bg-destructive/15";
  }

  return "text-[#4caf50] bg-[#4caf50]/20";
};
