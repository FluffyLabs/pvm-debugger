import { Table, TableRow, TableBody, TableCell } from "@/components/ui/table.tsx";
import { mapInstructionsArgsByType } from "./utils";
import { CurrentInstruction } from "../Debugger/debug";
import classNames from "classnames";

export const Instructions = ({ programPreviewResult, currentInstruction }: { programPreviewResult: CurrentInstruction[] | undefined; currentInstruction: CurrentInstruction | undefined }) => {
  const isActive = (programRow: CurrentInstruction) => currentInstruction?.name === programRow.name && (!("args" in programRow) || !("args" in currentInstruction) || currentInstruction?.args?.immediate === programRow?.args?.immediate);
  return (
    <div className="font-mono h-2/4 overflow-auto scroll-auto border-2 rounded-md">
      <Table>
        <TableBody>
          {!!programPreviewResult?.length &&
            programPreviewResult.map((programRow) => (
              <TableRow className={classNames("hover:bg-gray-300", { "bg-gray-200": isActive(programRow) })}>
                <TableCell className="p-1.5">
                  <span className="uppercase font-bold">{programRow.name}</span>
                  &nbsp;
                  <span className="">{"args" in programRow && mapInstructionsArgsByType(programRow.args)}</span>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
};
