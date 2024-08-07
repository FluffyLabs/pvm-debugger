import { CurrentInstruction } from "@/components/Debugger/debug.ts";
import { instructionsToLatex } from "@/utils/instructionsToLatex.ts";
import { BlockMath } from "react-katex";

export const KnowledgeBase = ({ currentInstruction }: { currentInstruction: CurrentInstruction | undefined }) => {
  return (
    <div className="border-2 rounded-md h-64">
      <div>{JSON.stringify(currentInstruction)}</div>
      <BlockMath math={instructionsToLatex[currentInstruction?.name?.toUpperCase() as keyof typeof instructionsToLatex]} />
    </div>
  );
};
