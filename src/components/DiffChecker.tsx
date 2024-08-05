import ReactJsonViewCompare from "react-json-view-compare";

export const DiffChecker = (args: { expected?: unknown; actual?: unknown }) => {
  if (!args.actual) return null;

  return (
    <div className="col-span-3 container py-3 text-left text-xs">
      <div className="p-3 bg-slate-100 rounded-md">
        <ReactJsonViewCompare oldData={args.expected} newData={args.actual} />
      </div>
    </div>
  );
};
