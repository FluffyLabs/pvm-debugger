import { toast } from "react-toastify";

class Logger {
  error(msg: string, error: unknown) {
    toast.error(
      <div>
        {msg}
        <br />
        Check console for more information
      </div>,
    );

    console.error("Catched error:", error);
  }

  warn(...msg: unknown[]) {
    console.warn("⚠️⚠️⚠️⚠️⚠️⚠️", ...msg);
  }

  info(...msg: unknown[]) {
    // eslint-disable-next-line no-console
    console.info("🪵🪵🪵🪵🪵", ...msg);
  }

  debug(...msg: unknown[]) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("💻💻💻💻💻 DEV LOG: \n", ...msg);
    }
  }
}

export const logger = new Logger();
