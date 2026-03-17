import { formatRegister } from "./value-format";

interface RegisterRowProps {
  index: number;
  value: bigint;
}

export function RegisterRow({ index, value }: RegisterRowProps) {
  const { hex, decimal } = formatRegister(value);

  return (
    <div
      data-testid={`register-row-${index}`}
      className="flex items-baseline gap-2 px-2 py-0.5 font-mono text-xs hover:bg-muted/50"
    >
      <span data-testid={`register-label-${index}`} className="text-muted-foreground w-8 shrink-0 select-none">
        ω{index}:
      </span>
      <span data-testid={`register-hex-${index}`} className="text-foreground">
        {hex}
      </span>
      <span data-testid={`register-decimal-${index}`} className="text-muted-foreground">
        ({decimal})
      </span>
    </div>
  );
}
