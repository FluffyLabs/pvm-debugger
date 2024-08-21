import { Status } from "@/types/pvm";

export const getStatusColor = (status?: Status) => {
  if (status === Status.OK || status === Status.HALT) {
    return "#4caf50";
  }

  if (status === Status.PANIC) {
    return "#f44336";
  }

  return "#55b3f3";
};
