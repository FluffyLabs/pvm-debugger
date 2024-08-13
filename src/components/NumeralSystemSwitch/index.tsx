import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useContext } from "react";
import { NumeralSystem, NumeralSystemContext } from "@/context/NumeralSystem.tsx";

export const NumeralSystemSwitch = () => {
  const { setNumeralSystem } = useContext(NumeralSystemContext);

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="numerical-system-mode">Dec</Label>
      <Switch
        id="numerical-system-mode"
        onCheckedChange={(checked) => setNumeralSystem(checked ? NumeralSystem.HEXADECIMAL : NumeralSystem.DECIMAL)}
      />
      <Label htmlFor="numerical-system-mode">Hex</Label>
    </div>
  );
};
