import { useEffect, useMemo, useState } from "react";
import { BlockMath } from "react-katex";
import { ExternalLink } from "lucide-react";
import { InstructionKnowledgeBaseEntry, instructionsKnowledgeBase } from "@/utils/instructionsKnowledgeBase.ts";
import { CurrentInstruction } from "@/types/pvm";
import { debounce } from "lodash";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search } from "../SearchInput";

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
    <div className="border-2 rounded-md overflow-auto max-sm:hidden">
      <Accordion type="single" collapsible className="overflow-hidden h-full">
        <AccordionItem value="item-1" className="overflow-hidden h-full">
          <AccordionTrigger className="mb-2">
            <div className="flex w-full items-center justify-between">
              <span className="ml-4 text-title-foreground">I found {filteredInstructions.length} results</span>
              <Search
                className="w-[300px] border-none text-foreground"
                inputClassName="text-title-foreground"
                type="text"
                placeholder="Search for instructions..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="h-[200px] overflow-auto relative">
              <div className="divide-y overflow-auto  flex flex-wrap gap-3 mx-4">
                {filteredInstructions.map((instruction, i) => {
                  const currentInstructionFromKnowledgeBase = instructionsKnowledgeBase.find(
                    (instructionFromKB) => instructionFromKB.name?.toUpperCase() === instruction.name?.toUpperCase(),
                  );
                  return (
                    <div className="border p-3 rounded w-[285px] max-h-[250px] overflow-auto" key={i}>
                      <div className="flex justify-between">
                        <p className="font-poppins font-bold uppercase">{instruction?.name}</p>

                        <div className="flex justify-end">
                          {currentInstructionFromKnowledgeBase?.linkInGrayPaperReader && (
                            <a href={currentInstructionFromKnowledgeBase?.linkInGrayPaperReader} target="_blank">
                              <ExternalLink height="18px" width="18px" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <BlockMath math={currentInstructionFromKnowledgeBase?.latex || ""} />
                      </div>
                      <p className="my-3">{currentInstructionFromKnowledgeBase?.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
