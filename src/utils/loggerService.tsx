import { toast } from "react-toastify";

export const logError = (msg: string, error: unknown) => {
  toast.error(
    <div>
      {msg}
      <br />
      Check console for more information
    </div>,
  );

  console.error("Catched error:", error);
};

export const logInfo = (...msg: unknown[]) => {
  // eslint-disable-next-line no-console
  console.info("🪵🪵🪵🪵🪵", ...msg);
};

export const logDebug = (...msg: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("☢️☢️☢️☢️☢️ DEV LOG: \n", ...msg);
  }
};
