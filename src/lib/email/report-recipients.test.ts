import { describe, it, expect } from 'vitest'
import {
  parseRecipientList,
  pickDeliverableEmails,
  mergeReportRecipients,
} from './report-recipients'

describe('parseRecipientList', () => {
  it('returns empty array for undefined/empty', () => {
    expect(parseRecipientList(undefined)).toEqual([])
    expect(parseRecipientList('')).toEqual([])
  })

  it('splits on comma and semicolon, trims, lowercases', () => {
    expect(parseRecipientList('A@X.com, b@y.com ; C@Z.com')).toEqual([
      'a@x.com',
      'b@y.com',
      'c@z.com',
    ])
  })

  it('dedupes and drops entries without @', () => {
    expect(parseRecipientList('a@x.com,a@x.com,notanemail')).toEqual(['a@x.com'])
  })
})

describe('pickDeliverableEmails', () => {
  it('filters out internal usernames and null/empty', () => {
    const result = pickDeliverableEmails([
      'dono@gmail.com',
      'caixa01@vendas-app.interno',
      null,
      undefined,
      '',
    ])
    expect(result).toEqual(['dono@gmail.com'])
  })

  it('dedupes case-insensitively', () => {
    expect(pickDeliverableEmails(['Dono@Gmail.com', 'dono@gmail.com'])).toEqual([
      'dono@gmail.com',
    ])
  })

  it('returns empty when only internal accounts exist', () => {
    expect(pickDeliverableEmails(['a@vendas-app.interno'])).toEqual([])
  })
})

describe('mergeReportRecipients', () => {
  it('merges the three sources: admins, REPORT_EMAIL and the table', () => {
    const result = mergeReportRecipients(
      ['dono@gmail.com', 'caixa01@vendas-app.interno'],
      'gestor@empresa.com, contador@empresa.com',
      ['extra@cliente.com'],
    )
    expect(result).toEqual([
      'dono@gmail.com',
      'gestor@empresa.com',
      'contador@empresa.com',
      'extra@cliente.com',
    ])
  })

  it('dedupes case-insensitively across all three sources', () => {
    const result = mergeReportRecipients(
      ['Dono@Gmail.com'],
      'dono@gmail.com',
      ['DONO@gmail.com'],
    )
    expect(result).toEqual(['dono@gmail.com'])
  })

  it('drops internal usernames coming from any source', () => {
    const result = mergeReportRecipients(
      ['caixa01@vendas-app.interno'],
      undefined,
      ['caixa02@vendas-app.interno', 'real@cliente.com'],
    )
    expect(result).toEqual(['real@cliente.com'])
  })

  it('handles empty/undefined sources gracefully', () => {
    expect(mergeReportRecipients([], undefined, [])).toEqual([])
  })

  it('still works when only the table has recipients', () => {
    expect(mergeReportRecipients([], undefined, ['only@table.com'])).toEqual([
      'only@table.com',
    ])
  })
})
