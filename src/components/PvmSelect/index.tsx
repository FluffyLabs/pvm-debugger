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

export const PvmSelect = () => {
  return (
    <Select value="typeberry">
      <SelectTrigger>
        <SelectValue placeholder="Select a PVM" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="typeberry">@typeberry/pvm-{import.meta.env.TYPEBERRY_PVM_VERSION}</SelectItem>
          <SelectSeparator />
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
