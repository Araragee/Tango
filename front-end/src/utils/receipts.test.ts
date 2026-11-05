import { describe, it, expect, beforeEach, vi } from 'vitest'

const { createSignedUrl } = vi.hoisted(() => ({ createSignedUrl: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl }) } },
}))

import { receiptRef, parseReceipt, isPdfReceipt, resolveReceiptUrl } from './receipts'

const LEGACY = 'https://abcd.supabase.co/storage/v1/object/public/avatars/receipts/u1/tx_1.jpg'

describe('receipts', () => {
  beforeEach(() => createSignedUrl.mockReset())

  it('round-trips a storage reference', () => {
    const ref = receiptRef('receipts', 'hh-1/tx_1.pdf')
    expect(ref).toBe('storage:receipts/hh-1/tx_1.pdf')
    expect(parseReceipt(ref)).toEqual({ bucket: 'receipts', path: 'hh-1/tx_1.pdf' })
  })

  it('parses legacy public URLs', () => {
    expect(parseReceipt(LEGACY)).toEqual({ bucket: 'avatars', path: 'receipts/u1/tx_1.jpg' })
  })

  it('rejects malformed and foreign values', () => {
    expect(parseReceipt('storage:')).toBeNull()
    expect(parseReceipt('storage:receipts/')).toBeNull()
    expect(parseReceipt('https://evil.example.com/x.jpg')).toBeNull()
    expect(parseReceipt(null)).toBeNull()
  })

  it('detects PDFs', () => {
    expect(isPdfReceipt('storage:receipts/hh/a.PDF')).toBe(true)
    expect(isPdfReceipt(LEGACY)).toBe(false)
  })

  it('signs storage references', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://abcd.supabase.co/signed?token=t' }, error: null })
    await expect(resolveReceiptUrl('storage:receipts/hh/a.jpg')).resolves.toBe('https://abcd.supabase.co/signed?token=t')
    expect(createSignedUrl).toHaveBeenCalledWith('hh/a.jpg', 3600)
  })

  it('returns null when signing fails', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error('denied') })
    await expect(resolveReceiptUrl('storage:receipts/hh/a.jpg')).resolves.toBeNull()
  })

  it('passes legacy URLs through but never unsafe schemes', async () => {
    await expect(resolveReceiptUrl(LEGACY)).resolves.toBe(LEGACY)
    await expect(resolveReceiptUrl('javascript:alert(1)')).resolves.toBeNull()
    expect(createSignedUrl).not.toHaveBeenCalled()
  })
})
