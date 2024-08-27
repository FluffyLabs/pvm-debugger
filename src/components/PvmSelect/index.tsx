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
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export const PvmSelect = ({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: { type: string; param: string | Blob }) => void;
}) => {
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

  const handlePvmUpload = (file: Blob) => {
    onValueChange({
      type: "wasm-file",
      param: file,
    });
  };

  return (
    <>
      <Select
        value={value}
        onValueChange={(value) => {
          if (value === "wasm-file") {
            setIsFileDialogOpen(true);
          }

          if (value === "wasm-file") {
            onValueChange({
              type: "built-in",
              param: "typeberry",
            });
          }
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
            <SelectItem value="wasm-file">Upload custom PVM from a file as a WASM</SelectItem>

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
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            <Input
              type="file"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handlePvmUpload(e.target.files[0]);
                }
              }}
            />
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
