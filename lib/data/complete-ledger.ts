export type LedgerPage<T> = { data: T[] | null; count: number | null; error: unknown }

/** Read all visible rows, not a latest-N performance sample. Callers must pin
 * created_at <= asOf and order by created_at, id on every page. A safety limit
 * is an explicit failure, never permission to report a partial ledger. */
export async function readCompleteLedger<T extends { id: string }>(
  fetchPage: (from: number, to: number) => PromiseLike<LedgerPage<T>>,
  pageSize = 250,
  maxRows = 10_000,
) {
  const rows: T[] = [], ids = new Set<string>()
  let expected: number | null = null
  const fail = (error: string) => ({ rows, expected, complete: false, error })
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(maxRows) || maxRows < 1) return fail('Invalid pagination bounds.')
  try {
    do {
      const page = await fetchPage(rows.length, Math.min(rows.length + pageSize, maxRows) - 1)
      if (page.error || !Array.isArray(page.data)) return fail('A ledger page could not be read. Retry before interpreting performance.')
      if (page.count == null || !Number.isInteger(page.count) || page.count < 0) return fail('An exact ledger count is unavailable.')
      if (expected !== null && expected !== page.count) return fail('The ledger changed during pagination. Reload for a consistent report.')
      expected = page.count
      if (expected > maxRows) return fail(`The ledger exceeds the ${maxRows.toLocaleString('en-US')}-row safety limit; no complete result is claimed.`)
      if (rows.length + page.data.length > expected) return fail('The returned ledger exceeds its exact count.')
      for (const row of page.data) {
        if (!row?.id || ids.has(row.id)) return fail('A missing or duplicate row ID prevents complete-ledger verification.')
        ids.add(row.id); rows.push(row)
      }
      if (!page.data.length && rows.length < expected) return fail('Pagination ended before the exact ledger count was reached.')
    } while (expected !== null && rows.length < expected)
    return { rows, expected, complete: true, error: null }
  } catch {
    return fail('The ledger request failed. No complete result is claimed.')
  }
}
