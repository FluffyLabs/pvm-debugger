import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useContext } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { NumeralSystem } from "@/context/NumeralSystem";
import { cn } from "@/lib/utils";

export const NumeralSystemSwitch = ({ className }: { className: string }) => {
  const { setNumeralSystem, numeralSystem } = useContext(NumeralSystemContext);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Label
        htmlFor="numerical-system-mode"
        className={cn("text-xs", !numeralSystem ? "text-white" : "text-[#858585]")}
      >
        Dec
      </Label>
      <Switch
        className="border-[#3B4040]"
        id="numerical-system-mode"
        checked={numeralSystem === NumeralSystem.HEXADECIMAL}
        onCheckedChange={(checked) => setNumeralSystem(checked ? NumeralSystem.HEXADECIMAL : NumeralSystem.DECIMAL)}
      />
      <Label htmlFor="numerical-system-mode" className={cn("text-xs", numeralSystem ? "text-white" : "text-[#858585]")}>
        Hex
      </Label>
    </div>
  );
};
