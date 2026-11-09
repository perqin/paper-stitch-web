import type { Composition } from './composition.ts'

export function getAlignmentImageId(
  composition: Composition,
  focusedImageId: string | null,
  enabled: boolean,
): string | undefined {
  if (!enabled || focusedImageId === null) return undefined
  const index = composition.placements.findIndex(({ id }) => id === focusedImageId)
  if (index <= 0) return undefined
  const focused = composition.placements[index]
  const overlaps = (neighbor: Composition['placements'][number] | undefined) => neighbor !== undefined
    && focused.x < neighbor.x + neighbor.width
    && neighbor.x < focused.x + focused.width
    && focused.y < neighbor.y + neighbor.height
    && neighbor.y < focused.y + focused.height
  return overlaps(composition.placements[index - 1]) || overlaps(composition.placements[index + 1])
    ? focusedImageId : undefined
}
