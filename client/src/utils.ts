import { AdminFlags, MediciFlags } from "./types/flags";

/**
 * Generates a seed for initialization of AssetController. Value may range between 0 and 2^53-1.
 * This method does not guarantee non-collision, so multiple generations may be required.
 * @returns A seed number.
 */
export const generateUniqueSeed = () => {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
};

/**
 * Combines one ore more flag enums into a single combination flag.
 * @returns Number
 */
export const computeFlags = (
  ...flags: (MediciFlags | AdminFlags)[]
): number => {
  return flags.reduce((accumulator, flag) => accumulator | flag, 0);
};
