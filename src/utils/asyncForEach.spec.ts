import { asyncForEach } from './asyncForEach'

describe('asyncForEach', () => {
  it('should execute the async callback for each item in the given array', async () => {
    const callback = jest.fn().mockImplementation(() => Promise.resolve())
    const array = [1, 2, 3]

    await asyncForEach(array, callback)

    expect(callback.mock.calls.length).toEqual(3)
    expect(callback.mock.calls[0]).toEqual([1, 0, array])
    expect(callback.mock.calls[1]).toEqual([2, 1, array])
    expect(callback.mock.calls[2]).toEqual([3, 2, array])
  })
})
