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
