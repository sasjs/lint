import { getIndicesOf } from './getIndicesOf'

describe('getIndicesOf', () => {
  it('should return an empty array when the search string is empty', () => {
    expect(getIndicesOf('', 'anything')).toEqual([])
  })

  it('should return every index of a repeated search string', () => {
    expect(getIndicesOf('a', 'banana')).toEqual([1, 3, 5])
    expect(getIndicesOf('na', 'banana')).toEqual([2, 4])
  })

  it('should not overlap matches', () => {
    expect(getIndicesOf('aa', 'aaaa')).toEqual([0, 2])
  })

  it('should return an empty array when the search string is absent', () => {
    expect(getIndicesOf('z', 'banana')).toEqual([])
  })

  it('should be case sensitive by default', () => {
    expect(getIndicesOf('A', 'aAa')).toEqual([1])
  })

  it('should fold case when asked to', () => {
    expect(getIndicesOf('A', 'aAa', false)).toEqual([0, 1, 2])
    expect(getIndicesOf('NA', 'banana', false)).toEqual([2, 4])
  })
})
