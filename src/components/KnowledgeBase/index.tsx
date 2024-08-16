import { useEffect, useState } from "react";
import { BlockMath } from "react-katex";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { InstructionKnowledgeBaseEntry, instructionsKnowledgeBase } from "@/utils/instructionsKnowledgeBase.ts";
import { CurrentInstruction } from "@/types/pvm";

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
    setFilteredInstructions(
      instructionsKnowledgeBase.filter((instruction) =>
        instruction.name?.toUpperCase().includes(searchText.toUpperCase()),
      ),
    );
  }, [searchText]);

  return (
    <div className="border-2 rounded-md min-h-[450px] h-[70vh] w-[30vw] p-3 overflow-auto">
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
        {filteredInstructions.map((instruction, i) => {
          const currentInstructionFromKnowledgeBase = instructionsKnowledgeBase.find(
            (instructionFromKB) => instructionFromKB.name?.toUpperCase() === instruction.name?.toUpperCase(),
          );
          return (
            <div key={i}>
              <p className="font-mono font-bold uppercase my-3">{instruction?.name}</p>
              <div className="text-left">
                <BlockMath math={currentInstructionFromKnowledgeBase?.latex as string} />
              </div>
              <p className="my-3">{currentInstructionFromKnowledgeBase?.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
