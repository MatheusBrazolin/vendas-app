import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { tryQuery } from './try-query'

describe('tryQuery', () => {
  it('returns the function result when it resolves before the timeout', async () => {
    const fn = vi.fn().mockResolvedValue('dados')
    const result = await tryQuery(fn, 'fallback')
    expect(result).toEqual({ data: 'dados', offline: false })
  })

  it('returns the fallback when the function rejects', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('connection refused'))
    const result = await tryQuery(fn, 'fallback')
    expect(result).toEqual({ data: 'fallback', offline: true })
  })

  it('marks offline: false on success', async () => {
    const fn = vi.fn().mockResolvedValue([])
    const { offline } = await tryQuery(fn, null)
    expect(offline).toBe(false)
  })

  it('marks offline: true on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('down'))
    const { offline } = await tryQuery(fn, null)
    expect(offline).toBe(true)
  })

  it('returns custom fallback type correctly', async () => {
    const fallback = { items: [], total: 0 }
    const fn = vi.fn().mockRejectedValue(new Error())
    const result = await tryQuery(fn, fallback)
    expect(result.data).toBe(fallback)
  })

  describe('timeout (fake timers)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('returns fallback when the function never resolves within 3000ms (default)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const fn = () => new Promise<string>(() => {}) // never resolves

      const promise = tryQuery(fn, 'fallback')
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({ data: 'fallback', offline: true })
    })

    it('respects a custom timeoutMs', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const fn = () => new Promise<string>(() => {})

      const promise = tryQuery(fn, 'fallback', 1000)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({ data: 'fallback', offline: true })
    })

    it('resolves with real data when fn finishes before the timer fires', async () => {
      // Resolve synchronously via microtask — the timer should be beaten.
      const fn = () => Promise.resolve('fresh')

      const result = await tryQuery(fn, 'fallback', 3000)

      // Timer hasn't fired (fake timers were never advanced)
      expect(result).toEqual({ data: 'fresh', offline: false })
    })
  })
})
