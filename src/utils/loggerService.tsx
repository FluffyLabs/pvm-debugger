import { throttle } from "lodash";
import { toast } from "react-toastify";

const errorToast = throttle((msg: string) => {
  toast.error(
    <div>
      {msg}
      <br />
      Check console for more information
    </div>,
    { autoClose: 3000 },
  );
}, 6000);
class Logger {
  error(msg: string, { error, hideToast }: { error: unknown; hideToast?: boolean }) {
    if (!hideToast) {
      errorToast(msg);
    }

    console.error("‼️‼️‼️‼️Catched error:", error);
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
