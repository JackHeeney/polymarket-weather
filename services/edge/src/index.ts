import type { BucketEstimate } from "../../../packages/types/src/index.js";

export const rankBucketEstimates = (estimates: BucketEstimate[]): BucketEstimate[] =>
  [...estimates].sort((a, b) => b.edge - a.edge);
