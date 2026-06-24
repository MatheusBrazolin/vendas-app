import { describe, it, expect, vi, afterEach } from 'vitest'
import { printReceipt, type PrintReceiptData } from './print-receipt'

const baseData: PrintReceiptData = {
  items: [
    { name: 'Coca-Cola 2L', quantity: 2, unit_price: 8.5 },
    { name: 'Pão', quantity: 1, unit_price: 1.25 },
  ],
  total: 18.25,
  paymentLabel: 'Dinheiro',
  date: new Date('2026-06-08T12:00:00'),
}

afterEach(() => {
  vi.restoreAllMocks()
})

/** Stubs window.open and captures everything written to the fake document. */
function stubPrintWindow() {
  let html = ''
  const fakeWin = {
    document: {
      open: vi.fn(),
      write: vi.fn((chunk: string) => {
        html += chunk
      }),
      close: vi.fn(),
    },
  }
  const openSpy = vi
    .spyOn(window, 'open')
    .mockReturnValue(fakeWin as unknown as Window)
  return { openSpy, getHtml: () => html }
}

describe('printReceipt', () => {
  it('uses iframe fallback and returns true when the popup window is blocked', () => {
    // Electron blocks window.open — the function falls back to a hidden iframe.
    // jsdom provides a real contentDocument on iframes, so the fallback succeeds.
    vi.spyOn(window, 'open').mockReturnValue(null)
    expect(printReceipt(baseData)).toBe(true)
  })

  it('returns false when both popup and iframe fallback fail', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      ((tag: string) => {
        if (tag === 'iframe') {
          const frame = original('iframe')
          Object.defineProperty(frame, 'contentDocument', { value: null, configurable: true })
          return frame
        }
        return original(tag)
      }) as unknown as typeof document.createElement,
    )
    expect(printReceipt(baseData)).toBe(false)
  })

  it('returns true and writes an HTML document when the window opens', () => {
    const { getHtml } = stubPrintWindow()
    expect(printReceipt(baseData)).toBe(true)
    expect(getHtml()).toContain('<!doctype html>')
  })

  it('renders every item and the total', () => {
    const { getHtml } = stubPrintWindow()
    printReceipt(baseData)
    const html = getHtml()
    expect(html).toContain('Coca-Cola 2L')
    expect(html).toContain('Pão')
    expect(html).toContain('18,25')
  })

  it('shows the provisional warning only when flagged', () => {
    const { getHtml } = stubPrintWindow()
    printReceipt({ ...baseData, provisional: true })
    expect(getHtml()).toContain('PROVISÓRIO')
  })

  it('omits the provisional warning for confirmed sales', () => {
    const { getHtml } = stubPrintWindow()
    printReceipt({ ...baseData, provisional: false })
    expect(getHtml()).not.toContain('PROVISÓRIO')
  })

  it('escapes HTML in product names to prevent injection', () => {
    const { getHtml } = stubPrintWindow()
    printReceipt({
      ...baseData,
      items: [{ name: '<script>alert(1)</script>', quantity: 1, unit_price: 1 }],
    })
    const html = getHtml()
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes HTML in notes', () => {
    const { getHtml } = stubPrintWindow()
    printReceipt({ ...baseData, notes: '<b>oi</b>' })
    const html = getHtml()
    expect(html).toContain('&lt;b&gt;oi&lt;/b&gt;')
  })
})
