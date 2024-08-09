import { useEffect, useState } from "react";
import { BlockMath } from "react-katex";
import { Search } from "lucide-react";
import { CurrentInstruction } from "@/components/Debugger/debug.ts";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { InstructionKnowledgeBaseEntry, instructionsKnowledgeBase } from "@/utils/instructionsKnowledgeBase.ts";

export const KnowledgeBase = ({ currentInstruction }: { currentInstruction: CurrentInstruction | undefined }) => {
  const [filteredInstructions, setFilteredInstructions] = useState<InstructionKnowledgeBaseEntry[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    if (currentInstruction) {
      setFilteredInstructions([currentInstruction]);
      setSearchText(currentInstruction.name || "");
    }
  }, [currentInstruction]);

  useEffect(() => {
    setFilteredInstructions(instructionsKnowledgeBase.filter((instruction) => instruction.name?.toUpperCase().includes(searchText.toUpperCase())).slice(0, 3));
  }, [searchText]);

  return (
    <div className="border-2 rounded-md h-[70vh] p-3">
      <div className="flex w-full items-center space-x-2 mb-3">
        <Input
          type="text"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
          }}
        />
        <Button type="submit">
          <Search />
        </Button>
      </div>

      <div className="divide-y">
        {filteredInstructions.map((instruction) => {
          const currentInstructionFromKnowledgeBase = instructionsKnowledgeBase.find((instructionFromKB) => instructionFromKB.name?.toUpperCase() === instruction.name?.toUpperCase());
          return (
            <div>
              <p className="font-mono font-bold uppercase my-3">{instruction?.name}</p>
              <p className="text-left">
                <BlockMath math={currentInstructionFromKnowledgeBase?.latex as string} />
              </p>
              <p className="my-3">{currentInstructionFromKnowledgeBase?.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
