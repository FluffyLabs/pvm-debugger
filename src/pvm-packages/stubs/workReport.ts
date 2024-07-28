import type { Hash } from "./header";

export class WorkPackage {
  items: WorkItem[] = [];
}
export class WorkItem {}

// A total serialized size of a work-report may be no greater than W_r bytes.
export class WorkReport {
  // GP : a
  authorizerHash: Hash;
  // GP : o
  authorizerOutput: undefined;
  // GP : x
  refinementContext: RefinementContext;
  // GP : s
  packageSpecification: undefined;
  // GP : r
  results: WorkResult[];

  constructor() {
    this.refinementContext = new RefinementContext();
    this.results = [];
  }
}

// The context of the chain at the point that the report's corresponding
// work package has been evaluated.
export class RefinementContext {
  anchorHash: Hash;
  anchorPostStateRoot: Hash;
  anchorBeefyRoot: Hash;
  lookupAnchor: Hash;
  timeslot: undefined;
  preRequisiteWorkPackage?: undefined;
}

export class WorkResult {}
