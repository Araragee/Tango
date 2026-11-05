import { describe, it, expect } from 'vitest'
import { csvCell } from './csv'

describe('csvCell', () => {
  it('quotes and escapes embedded quotes', () => {
    expect(csvCell('Pizza "Hut"')).toBe('"Pizza ""Hut"""')
  })

  it('handles null/undefined', () => {
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
  })

  it.each(['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\t=x', '\r=x'])('neutralises formula %j', (input) => {
    expect(csvCell(input)).toBe(`"'${input.replace(/"/g, '""')}"`)
  })

  it('leaves ordinary text alone', () => {
    expect(csvCell('Groceries - weekly')).toBe('"Groceries - weekly"')
  })
})
