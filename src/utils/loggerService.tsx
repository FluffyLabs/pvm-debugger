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
      console.info(`
            .!YGBBPJ^
          :B@&57~!?P&@5
    ...:YBB@&:        !@@.            .~~!77! ~YY          ^JY~  7YJ.
^B&&&&@#!!7           ~@@PPY^        7@@@J~^.@@@         !@@5  &@@:
J@B:   .          .     J57?G@&:      7@@@P5P:&@@.G&B 5&#:#@@B^7@@@J.G&G 5&B
@@.               @&.        ^@&      7@@@.   @@@.@@@.@@@ Y@@? .@@@  @@& &@@
5@G.           GB5@@.        Y@G      ^&#P    B&P ?&#YB#P !&&^  #&P  J&#Y@@&
!&@#BBGJ     .@@Y!   .YBBB#&&J                        .               ~5@&^
  .:^!&@&^   .@@     &@?^^^.         ~&&&.          .@@B               .
    :@&JP@#  .@@   .Y@@P.            ?@@@.    ^!!~~^^@@&!!^  .^!~^
    ~@&^!@@   @@  .@@~^&@^           7@@@   ~@@P^@@#:@@#^@@&.#@@&7
      ^P#BY. :G@@P. &@5Y@@.           7@@@?777@@B!@@B:@@B^@@B.~#@@@^
            :@&:^@@. ~YY!              ~~^~~: .^~:~~. :~~~^.  :^~^.
            .&@5P@&
              ~JJ^
Logger initialized watch console for logs
    `);
    }
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
