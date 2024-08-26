import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink } from "lucide-react";

export const PvmSelect = ({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: { type: string; param: string }) => void;
}) => {
  return (
    <Select
      value={value}
      onValueChange={(value) => {
        if (value === "wasm-url") {
          // URL to test: https://fluffylabs.dev/pvm-shell/pkg/pvm_shell_bg.wasm
          const url = prompt(
            "Enter the URL of the PVM implementation (e.g. https://fluffylabs.dev/pvm-shell/pkg/pvm_shell_bg.wasm)",
          );

          try {
            const isValidUrl = Boolean(new URL(url ?? ""));
            if (url && isValidUrl) {
              onValueChange({
                type: value,
                param: url,
              });
              alert(`Loading PVM`);
            } else {
              alert("Invalid URL");
            }
          } catch (error) {
            alert("Invalid URL");
          }
        } else {
          onValueChange({
            type: "built-in",
            param: "typeberry",
          });
        }
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a PVM" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="built-in">@typeberry/pvm-{import.meta.env.TYPEBERRY_PVM_VERSION}</SelectItem>
          <SelectSeparator />
          <SelectItem value="wasm-url">Load custom PVM from URL as a WASM file</SelectItem>
          <SelectLabel>
            <span>
              Learn to add your PVM implementation here{" "}
              <a href="https://github.com/FluffyLabs/typeberry-toolkit/issues/81" target="_blank">
                <ExternalLink className="inline w-4 mb-1 text-blue-600" />
              </a>
            </span>
          </SelectLabel>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
