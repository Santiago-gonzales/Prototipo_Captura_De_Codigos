import type { ScanItem } from "./scan";

export interface Capture {
  items: ScanItem[];
  totalFound: number;
  differentCount: number;
}
