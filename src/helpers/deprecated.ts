import { BufferAttribute } from 'three'

/**
 * Sets `BufferAttribute.updateRange` since r159.
 */
export const setUpdateRange = (attribute: BufferAttribute, updateRange: { offset: number; count: number }): void => {
  if ('updateRanges' in attribute) {
    // r159
    // @ts-ignore
    attribute.updateRanges[0] = updateRange
  } else {
    // @ts-ignore
    attribute.updateRange = updateRange
  }
}
