import { AdminFlags, MediciFlags } from "./types/flags";

/**
 * Combines one ore more flag enums into a single combination flag.
 * @returns Number
 */
export const computeFlags = (
  ...flags: (MediciFlags | AdminFlags)[]
): number => {
  return flags.reduce((accumulator, flag) => accumulator | flag, 0);
};
