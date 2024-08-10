import { Table, TableRow, TableBody, TableCell } from "@/components/ui/table.tsx";
import { mapInstructionsArgsByType } from "./utils";
import { CurrentInstruction } from "../Debugger/debug";
import classNames from "classnames";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { NumeralSystemContext } from "@/context/NumeralSystem.tsx";
import { useContext } from "react";

export const Instructions = ({
  programPreviewResult,
  currentInstruction,
  instructionMode,
}: {
  programPreviewResult: CurrentInstruction[] | undefined;
  currentInstruction: CurrentInstruction | undefined;
  instructionMode: InstructionMode;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  const isActive = (programRow: CurrentInstruction) =>
    currentInstruction?.name === programRow.name &&
    (!("args" in programRow) ||
      !("args" in currentInstruction) ||
      currentInstruction?.args?.immediate === programRow?.args?.immediate);

  return (
    <div className="font-mono overflow-auto scroll-auto border-2 rounded-md h-full">
      <Table>
        <TableBody>
          {!!programPreviewResult?.length &&
            programPreviewResult.map((programRow) => (
              <TableRow className={classNames("hover:bg-gray-300", { "bg-gray-200": isActive(programRow) })}>
                {instructionMode === InstructionMode.BYTECODE && (
                  <TableCell className="p-1.5">
                    {programRow.instructionBytes && (
                      <span className="text-gray-500">
                        {[...programRow.instructionBytes]?.map((byte) => `${byte}`.padStart(3, "0")).join(" ")}
                      </span>
                    )}
                  </TableCell>
                )}
                {instructionMode === InstructionMode.ASM && (
                  <TableCell className="p-1.5">
                    <span className="uppercase font-bold">{programRow.name}</span>
                  </TableCell>
                )}
                <TableCell className="p-1.5">
                  <span className="">
                    {"args" in programRow && mapInstructionsArgsByType(programRow.args, numeralSystem)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
};
