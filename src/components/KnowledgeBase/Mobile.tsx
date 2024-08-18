import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerTrigger } from "@/components/ui/drawer";
import { KnowledgeBase } from ".";
import { Search } from "lucide-react";
import { CurrentInstruction } from "@/types/pvm";
export const MobileKnowledgeBase = ({ currentInstruction }: { currentInstruction: CurrentInstruction | undefined }) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full">
          <Search /> Open Gray Paper
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <KnowledgeBase currentInstruction={currentInstruction} />
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
