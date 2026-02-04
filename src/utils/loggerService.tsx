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
  constructor() {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.info(`Logger initialized watch console for logs
    `);
    }
  }

  group(msg: string) {
    // eslint-disable-next-line no-console
    console.group(msg);
  }

  groupEnd() {
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  error(msg: string, { error, hideToast }: { error: unknown; hideToast?: boolean }) {
    if (!hideToast) {
      errorToast(msg);
    }

    console.error("☢️", error);
  }

  warn(...msg: unknown[]) {
    console.warn("⚠️", ...msg);
  }

  info(...msg: unknown[]) {
    // eslint-disable-next-line no-console
    console.info("🪵", ...msg);
  }

  debug(...msg: unknown[]) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug("💻 DEV LOG: \n", ...msg);
    }
  }
}

export const logger = new Logger();
