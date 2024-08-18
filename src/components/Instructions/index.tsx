import { Table, TableRow, TableBody, TableCell } from "@/components/ui/table.tsx";
import { mapInstructionsArgsByType, valueToNumeralSystem } from "./utils";
import classNames from "classnames";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { NumeralSystem, NumeralSystemContext } from "@/context/NumeralSystem.tsx";
import { useContext, useMemo } from "react";
import { isEqual, omit } from "lodash";
import { CurrentInstruction } from "@/types/pvm";

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
  console.log(numeralSystem);
  const isActive = (programRow: CurrentInstruction) => {
    if (!currentInstruction) {
      return false;
    }

    if ("error" in programRow && "error" in currentInstruction) {
      return (
        programRow.name === currentInstruction.name && programRow.instructionCode === currentInstruction.instructionCode
      );
    }

    // Remove error instructions from type
    if ("error" in programRow || "error" in currentInstruction) {
      return false;
    }

    return isEqual(
      omit(currentInstruction, ["args.immediateDecoder", "instructionBytes", "address"]),
      omit(programRow, ["args.immediateDecoder", "instructionBytes", "address"]),
    );
  };

  const programPreviewResultWithAddress = useMemo(() => {
    if (!programPreviewResult) {
      return programPreviewResult;
    }
    let counter = 0;
    return programPreviewResult?.map((result) => {
      const isHex = numeralSystem === NumeralSystem.HEXADECIMAL;
      const valInNumeralSystem = isHex ? `${(counter >>> 0).toString(16)}` : counter.toString();
      const address = (
        <div>
          {isHex && <span className="opacity-20">0x</span>}
          {[...Array(8 - (isHex ? 2 : 0) - valInNumeralSystem.length)].map(() => (
            <span className="opacity-20">0</span>
          ))}
          <span>{valInNumeralSystem}</span>
        </div>
      );
      if ("args" in result) {
        counter += result.args.noOfInstructionsToSkip;
      }
      return { ...result, address };
    });
  }, [numeralSystem, programPreviewResult]);

  return (
    <div className="font-mono overflow-auto scroll-auto border-2 rounded-md h-full">
      <Table>
        <TableBody>
          {!!programPreviewResultWithAddress?.length &&
            programPreviewResultWithAddress.map((programRow, i) => (
              <TableRow className={classNames("hover:bg-gray-300", { "bg-[#55B3F3]": isActive(programRow) })} key={i}>
                {instructionMode === InstructionMode.BYTECODE && (
                  <>
                    <TableCell className="p-1.5">
                      <span className="uppercase">{programRow.address}</span>
                    </TableCell>
                    <TableCell className="p-1.5">
                      {programRow.instructionBytes && (
                        <span className="text-gray-500">
                          {[...programRow.instructionBytes]
                            ?.map((byte) => valueToNumeralSystem(byte, numeralSystem, numeralSystem ? 2 : 3))
                            .join(" ")}
                        </span>
                      )}
                    </TableCell>
                  </>
                )}
                {instructionMode === InstructionMode.ASM && (
                  <>
                    <TableCell className="p-1.5">
                      <span className="uppercase">{programRow.address}</span>
                    </TableCell>
                    <TableCell className="p-1.5">
                      <span className="uppercase font-bold">{programRow.name}</span>
                    </TableCell>
                    <TableCell className="p-1.5">
                      <span className="">
                        {"args" in programRow && mapInstructionsArgsByType(programRow.args, numeralSystem)}
                      </span>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
};
