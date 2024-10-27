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
  console.info("🪵🪵🪵🪵🪵", ...msg);
};

export const logDebug = (...msg: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.debug("☢️☢️☢️☢️☢️ DEV LOG: \n", ...msg);
  }
};
