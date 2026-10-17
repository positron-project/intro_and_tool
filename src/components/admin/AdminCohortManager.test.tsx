import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { cohortRows } = vi.hoisted(() => ({
  cohortRows: [
    {
      id: 'cohort-2029',
      year: '2029',
      generationLabel: '第四代 · 共学进行中',
      status: 'active',
      description: '2029 届简介',
      teams: [],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'cohort-2028',
      year: '2028',
      generationLabel: '第三代 · 已归档',
      status: 'archived',
      description: '2028 届简介',
      teams: [],
      createdAt: '',
      updatedAt: '',
    },
  ],
}))

vi.mock('../../services/club-config.context', () => ({
  useClubConfig: () => ({
    sortedCohorts: cohortRows,
    saveCohort: vi.fn(),
    removeCohort: vi.fn(),
    saveTeam: vi.fn(),
    removeTeam: vi.fn(),
  }),
  isCoreTeam: () => false,
}))

import { AdminCohortManager } from './AdminPage'

describe('AdminCohortManager', () => {
  it('打开时定位到指定届次后，仍允许切换到其他届次', () => {
    render(<AdminCohortManager initialCohortId="cohort-2029" managedMembers={[]} membersManaged={false} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /2028届/ }))

    expect(screen.getByRole('heading', { name: '2028 届资料' })).toBeTruthy()
  })
})
