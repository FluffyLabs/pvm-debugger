import type { Block } from "./block";

// GP: sigma
export class State {
  // GP: alpha
  //
  // "the authorization requirement which work done on that core must satisfy at the time
  // of being reported on-chain,"
  authorizatonRequirement: undefined;
  // GP: beta
  previousBlocks: Block[] = [];
  // GP: gamma
  //
  // "all other state concerning the determination of these[validator's] keys"
  validatorElectionState: undefined;
  // GP: delta
  services: undefined;
  // GP: eta
  entropyPool: undefined;
  // GP: iota
  //
  // Enqueued validator set for the next epoch.
  nextValidatorSet: undefined;
  // GP: kappa
  //
  // Validator set in the current epoch.
  currentValidatorSet: undefined;
  // GP: lambda
  //
  // Validator set archive.
  previousValidatorSets: undefined;
  // GP: rho
  //
  // "each of the cores' currently assigned `report`, the availability of whose
  // `work-package` must yet be assured by a super-majority of validators."
  workPackgesToConfirm: undefined;
  // GP: tau
  mostRecentTime: undefined;
  // GP: varphi
  //
  // `alpha` the authorization requirement which work done on that core must satisfy at the time
  // of being reported on-chain, together with the queue which fills this, `varphi`.
  enquedWorkPackages: undefined;
  // GP: chi
  priviledgedServices: undefined;
  // GP: psi
  ongoingDisputes: undefined;
}
