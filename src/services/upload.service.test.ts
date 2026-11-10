import { expect, it, vi } from 'vitest'

vi.mock('./api-client', () => ({
  apiConfig: { contentSource: 'api' },
  apiRequest: vi.fn().mockResolvedValue({ id: 'asset-1' }),
}))

import { apiRequest } from './api-client'
import { uploadAsset } from './upload.service'

it('gives resource attachment uploads a longer timeout than ordinary API calls', async () => {
  const file = new File([new Uint8Array([1])], 'mysql-database.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  await uploadAsset(file, { folder: 'resources' })

  expect(apiRequest).toHaveBeenCalledWith('/uploads', {
    method: 'POST',
    body: expect.any(FormData),
    signal: undefined,
    timeoutMs: 120_000,
  })
})
