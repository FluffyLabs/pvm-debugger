import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import { ChevronsUpDown } from "lucide-react";
import { BlockMath } from "react-katex";
import { instructionsToLatex } from "@/utils/instructionsToLatex.ts";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table.tsx";
import { Label } from "@/components/ui/label.tsx";
import { mapInstructionsArgsByType } from "./utils";
import { Button } from "@/components/ui/button";

export const Instructions = ({ programPreviewResult }: { programPreviewResult: unknown[] | undefined }) => {
  return (
    <div className="col-span-6 container py-3 font-mono">
      <Label>Instructions:</Label>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Instruction</TableHead>
            <TableHead>Gas</TableHead>
            <TableHead></TableHead>
            {/*<TableHead>Args</TableHead>*/}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!!programPreviewResult?.length &&
            programPreviewResult.map((programRow: any) => (
              <Collapsible asChild>
                <>
                  <TableRow>
                    <TableCell>{programRow.instructionCode}</TableCell>
                    <TableCell>
                      <HoverCard>
                        <HoverCardTrigger>
                          <span className="uppercase font-bold">{programRow.name}</span>
                          &nbsp;
                          <span className="font-bold">{mapInstructionsArgsByType(programRow.args)}</span>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <pre>{JSON.stringify(programRow.args, null, 2)}</pre>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell>{programRow.gas}</TableCell>
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                          <ChevronsUpDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow>
                      <TableCell colSpan={3}>
                        <BlockMath math={instructionsToLatex[programRow.name?.toUpperCase() as keyof typeof instructionsToLatex]} />
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
        </TableBody>
      </Table>
    </div>
  );
};
