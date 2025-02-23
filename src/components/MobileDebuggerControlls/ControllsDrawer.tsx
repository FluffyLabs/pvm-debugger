import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter } from "@/components/ui/drawer";

export const ControllsDrawer = () => {
  return (
    <Drawer defaultOpen handleOnly>
      <DrawerContent>
        weffrg
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
