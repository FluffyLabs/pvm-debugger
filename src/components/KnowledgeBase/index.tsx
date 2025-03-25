import { useEffect, useMemo, useState } from "react";
import { BlockMath } from "react-katex";
import { ExternalLink } from "lucide-react";
import { InstructionKnowledgeBaseEntry, instructionsKnowledgeBase } from "@/utils/instructionsKnowledgeBase.ts";
import { CurrentInstruction } from "@/types/pvm";
import { debounce } from "lodash";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search } from "../SearchInput";

const OPEN_VALUE = "item-1";
export const KnowledgeBase = ({ currentInstruction }: { currentInstruction: CurrentInstruction | undefined }) => {
  const [filteredInstructions, setFilteredInstructions] = useState<InstructionKnowledgeBaseEntry[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

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
    <div className="border-2 rounded-md max-sm:hidden">
      <Accordion
        type="single"
        collapsible
        className="overflow-hidden h-full"
        value={isOpen ? OPEN_VALUE : ""}
        onValueChange={(value) => setIsOpen(value === OPEN_VALUE)}
      >
        <AccordionItem value={OPEN_VALUE} className="overflow-hidden h-full">
          <AccordionTrigger isOpen={isOpen}>
            <Search
              className="border-none text-foreground px-4"
              inputClassName="text-title-foreground"
              type="text"
              placeholder="Search for instructions..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
              }}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setIsOpen(searchText === "" ? false : isOpen)}
            />
          </AccordionTrigger>
          <AccordionContent>
            <div className="h-[160px] pb-3 overflow-auto relative">
              <div className="overflow-auto  flex flex-wrap gap-3 mx-4">
                {filteredInstructions.length === 0 && (
                  <div className="text-center m-6 flex-1">
                    <p className="font-poppins font-bold uppercase">no instructions found</p>
                  </div>
                )}
                {filteredInstructions.map((instruction, i) => {
                  const currentInstructionFromKnowledgeBase = instructionsKnowledgeBase.find(
                    (instructionFromKB) => instructionFromKB.name?.toUpperCase() === instruction.name?.toUpperCase(),
                  );
                  return (
                    <div className="border p-3 rounded w-[355px] max-h-[275px] overflow-auto" key={i}>
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
