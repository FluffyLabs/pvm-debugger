import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useContext } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { NumeralSystem } from "@/context/NumeralSystem";

export const NumeralSystemSwitch = ({ className }: { className: string }) => {
  const { setNumeralSystem } = useContext(NumeralSystemContext);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Label htmlFor="numerical-system-mode">DEC</Label>
      <Switch
        id="numerical-system-mode"
        onCheckedChange={(checked) => setNumeralSystem(checked ? NumeralSystem.HEXADECIMAL : NumeralSystem.DECIMAL)}
      />
      <Label htmlFor="numerical-system-mode">HEX</Label>
    </div>
  );
};
