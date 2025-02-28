import { Status } from "@/types/pvm";

export const getStatusColor = (status?: Status) => {
  if (status === Status.OK) {
    return "text-brand-dark bg-brand-light";
  }

  if (status === Status.HALT || status === Status.HOST) {
    return "bg-[#FFFDCF] text-[#D0A21D]";
  }

  if (status === Status.PANIC) {
    return "text-destructive bg-destructive/15";
  }

  return "text-[#4caf50]";
};
