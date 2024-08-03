import { Pvm } from "@/pvm-packages/pvm/pvm";
import ReactJsonViewCompare from "react-json-view-compare";
import { ExpectedState } from "./ProgramUpload/types";

const actualToExpected = (actual: ReturnType<Pvm["getState"]>): ExpectedState | undefined => {
  if (!actual) return;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pageMap, ...rest } = actual;
  return rest as ExpectedState;
};

export const DiffChecker = (args: { expected?: ExpectedState; actual: ReturnType<Pvm["getState"]> }) => {
  const actual = actualToExpected(args.actual);

  if (!args.actual) return null;

  return <ReactJsonViewCompare oldData={args.expected} newData={actual} />;
};
