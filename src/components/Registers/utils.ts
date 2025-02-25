import { Status } from "@/types/pvm";

export const getStatusColor = (status?: Status) => {
  if (status === Status.OK || status === Status.HALT) {
    return "text-brand-dark bg-brand-light";
  }

  if (status === Status.PANIC) {
    return "text-destructive";
  }

  return "text-[#4caf50]";
};
