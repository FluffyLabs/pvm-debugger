import { useEffect, useMemo, useState } from "react";
import { BlockMath } from "react-katex";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { InstructionKnowledgeBaseEntry, instructionsKnowledgeBase } from "@/utils/instructionsKnowledgeBase.ts";
import { CurrentInstruction } from "@/types/pvm";
import { debounce } from "lodash";

export const KnowledgeBase = ({ currentInstruction }: { currentInstruction: CurrentInstruction | undefined }) => {
  const [filteredInstructions, setFilteredInstructions] = useState<InstructionKnowledgeBaseEntry[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  const setSearchLater = useMemo(() => {
    return debounce(
      (currentInstruction) => {
        if (currentInstruction) {
          setSearchText(currentInstruction.name || "");
        }
      },
      10,
      { leading: true, trailing: true },
    );
  }, [setSearchText]);

  useEffect(() => {
    setSearchLater(currentInstruction);
  }, [currentInstruction, setSearchLater]);

  useEffect(() => {
    setFilteredInstructions(
      instructionsKnowledgeBase.filter((instruction) =>
        instruction.name?.toUpperCase().includes(searchText.toUpperCase()),
      ),
    );
  }, [searchText]);

  return (
    <div className="border-2 rounded-md overflow-auto h-[70vh] p-3">
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

      <div className="divide-y overflow-auto relative" style={{ maxHeight: "calc(100% - 60px)" }}>
        {filteredInstructions.map((instruction, i) => {
          const currentInstructionFromKnowledgeBase = instructionsKnowledgeBase.find(
            (instructionFromKB) => instructionFromKB.name?.toUpperCase() === instruction.name?.toUpperCase(),
          );
          return (
            <div key={i}>
              <p className="font-mono font-bold uppercase my-3">{instruction?.name}</p>
              <div className="text-left">
                <BlockMath math={currentInstructionFromKnowledgeBase?.latex || ""} />
              </div>
              <p className="my-3">{currentInstructionFromKnowledgeBase?.description}</p>
              <div className="flex mb-3 mr-3 justify-end">
                <Button
                  size={"sm"}
                  onClick={() => {
                    window.open(currentInstructionFromKnowledgeBase?.linkInGrayPaperReader, "_blank");
                  }}
                >
                  Open in GP
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
