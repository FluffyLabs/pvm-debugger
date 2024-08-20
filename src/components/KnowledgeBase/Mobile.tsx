import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter } from "@/components/ui/drawer";
import { KnowledgeBase } from ".";
import { CurrentInstruction } from "@/types/pvm";
import { useCallback } from "react";

type MobileKnowledgeBaseProps = {
  currentInstruction: CurrentInstruction | undefined;
  open: boolean;
  onClose: () => void;
};

export const MobileKnowledgeBase = ({ currentInstruction, open, onClose }: MobileKnowledgeBaseProps) => {
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
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
