export const SIDES = 20

/** Uniform integer 1..20. `random` returns [0, 1), like Math.random. */
export const rollD20 = (random: () => number = Math.random): number => {
  const roll = Math.floor(random() * SIDES) + 1
  return Math.min(SIDES, Math.max(1, roll))
}
