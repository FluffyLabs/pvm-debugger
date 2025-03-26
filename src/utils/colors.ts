import { Status } from "@/types/pvm";

export const getStatusColor = (isDarkMode?: boolean, status?: Status) => {
  if (status === Status.HALT) {
    return isDarkMode
      ? {
          background: "#4E4917",
          color: "#FFFDCF",
          border: "#696721",
        }
      : {
          background: "#FFFDCF",
          color: "#D0A21D",
          border: "#E1E7B5",
        };
  }

  if (status === Status.PANIC || status === Status.FAULT || status === Status.OOG) {
    return isDarkMode
      ? {
          background: "#4E1717",
          color: "#D34D4B",
          border: "#692121",
        }
      : {
          background: "#FFCFCF",
          color: "#D34D4B",
          border: "#E7B5B5",
        };
  }

  // Highlight color / OK color
  return isDarkMode
    ? {
        background: "#00413B",
        color: "#00FFEB",
        border: "#0F6760",
      }
    : {
        background: "#E4FFFD",
        color: "#17AFA3",
        border: "#B5E7E7",
      };
};
