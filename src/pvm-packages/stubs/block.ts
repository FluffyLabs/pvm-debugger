import type { Opaque } from "@typeberry/utils";
import { Header } from "./header";

export type Ticket = Opaque<void, "Tickets">;
export type Judgement = Opaque<void, "Judgements">;
export type PreImage = Opaque<void, "PreImages">;
export type Availability = Opaque<void, "Availability">;
export type Report = Opaque<void, "Report">;

// GP: B
export class Block {
  // GP: H
  public header: Header = new Header();
  // GP: E_T
  public ticketsAvailability: Ticket[] = [];
  // GP: E_J
  public judgements: Judgement[] = [];
  // GP: E_P
  public preImages: PreImage[] = [];
  // GP: E_A
  public availability: Availability[] = [];
  // GP: E_G
  public reports: Report[] = [];
}
