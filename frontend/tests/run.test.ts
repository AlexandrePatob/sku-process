import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Run } from '../src/types/run.ts'
import { filterRuns } from '../src/utils/run.ts'

test('combines status filter with case-insensitive literal search', () => {
  const active: Run = { run_id: 'Lote-ABC', total: null, completed_count: 5, status: 'pending', created_at: '2026-10-08T13:00:00.000Z' }
  const done: Run = { ...active, run_id: 'lote-%_', status: 'completed' }
  assert.deepEqual(filterRuns([active, done], 'pending', 'abc'), [active])
  assert.deepEqual(filterRuns([active, done], 'all', '%_'), [done])
  assert.deepEqual(filterRuns([active, done], 'failed', ''), [])
})
