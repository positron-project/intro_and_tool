import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { Member } from '../types'
import {
  Avatar,
  Tag,
  accentForMemberDirection,
  cohortYearNumber,
  mergeManagedTeamMembers,
  normalizeMemberRole,
  normalizeMemberTeamId,
  safeImageSource,
  safeLink,
  sortTeamMembers,
} from './app-shared'

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm-1',
    name: '成员',
    role: '组员',
    cohort: '2023 届',
    direction: '项目组',
    projects: [],
    initials: '成',
    accent: 'blue',
    ...overrides,
  }
}

describe('safeLink', () => {
  it('放行站内 hash 路由与 http(s) 链接', () => {
    expect(safeLink('#/tools')).toBe('#/tools')
    expect(safeLink('https://example.com/a?b=1')).toBe('https://example.com/a?b=1')
    expect(safeLink(' http://example.com ')).toBe('http://example.com')
  })

  it('拦截 javascript:/data: 与相对路径', () => {
    expect(safeLink('javascript:alert(1)')).toBeUndefined()
    expect(safeLink('data:text/html,<script>alert(1)</script>')).toBeUndefined()
    expect(safeLink('/relative/path')).toBeUndefined()
    expect(safeLink('')).toBeUndefined()
    expect(safeLink(undefined)).toBeUndefined()
  })
})

describe('safeImageSource', () => {
  it('额外放行内联的 png/jpeg/webp base64 图片', () => {
    const inline = 'data:image/png;base64,iVBORw0KGgo='
    expect(safeImageSource(inline)).toBe(inline)
    expect(safeImageSource('data:image/svg+xml;base64,PHN2Zz4=')).toBeUndefined()
    expect(safeImageSource('./assets/campus/campus-line-art.png')).toBeUndefined()
    expect(safeImageSource('https://cdn.example.com/cover.webp')).toBe('https://cdn.example.com/cover.webp')
  })
})

describe('normalizeMemberTeamId', () => {
  it('把方向名与后端届次数字 ID 归一到同一套小组标识', () => {
    expect(normalizeMemberTeamId('项目组')).toBe('project')
    expect(normalizeMemberTeamId('算法与模型')).toBe('algorithm')
    expect(normalizeMemberTeamId('网络安全')).toBe('cybersecurity')
    expect(normalizeMemberTeamId('待分配')).toBe('unassigned')
    expect(normalizeMemberTeamId('  ')).toBe('unassigned')
  })

  it('无法识别的方向回落到项目组', () => {
    expect(normalizeMemberTeamId('前端')).toBe('project')
  })
})

describe('accentForMemberDirection', () => {
  it('按小组返回主题色', () => {
    expect(accentForMemberDirection('算法组')).toBe('violet')
    expect(accentForMemberDirection('信息安全')).toBe('rose')
    expect(accentForMemberDirection('项目组')).toBe('blue')
  })
})

describe('cohortYearNumber', () => {
  it('抽出届次年份，缺失时返回 -1', () => {
    expect(cohortYearNumber('2023 届')).toBe(2023)
    expect(cohortYearNumber('待补充')).toBe(-1)
    expect(cohortYearNumber('')).toBe(-1)
  })
})

describe('normalizeMemberRole', () => {
  it('把自由文本职务归一到三档', () => {
    expect(normalizeMemberRole('小组组长')).toBe('组长')
    expect(normalizeMemberRole('项目负责人')).toBe('负责人')
    expect(normalizeMemberRole('组员')).toBe('组员')
    expect(normalizeMemberRole('')).toBe('组员')
  })
})

describe('sortTeamMembers', () => {
  it('按 组长 → 负责人 → 组员 排序，同职务保持原顺序', () => {
    const members = [
      makeMember({ id: 'a', name: '甲', role: '组员' }),
      makeMember({ id: 'b', name: '乙', role: '负责人' }),
      makeMember({ id: 'c', name: '丙', role: '组长' }),
      makeMember({ id: 'd', name: '丁', role: '组员' }),
    ]
    expect(sortTeamMembers(members).map((member) => member.id)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('不修改入参数组', () => {
    const members = [makeMember({ id: 'a', role: '组员' }), makeMember({ id: 'b', role: '组长' })]
    sortTeamMembers(members)
    expect(members.map((member) => member.id)).toEqual(['a', 'b'])
  })
})

describe('mergeManagedTeamMembers', () => {
  const team = {
    id: 'team-project',
    name: '项目组',
    members: [{ id: 'legacy-1', name: '旧成员', role: '组员', direction: '项目组', initials: '旧', accent: 'blue' }],
  }

  it('成员未托管时回落到届次自带名单', () => {
    expect(mergeManagedTeamMembers(team, [], '2023', false)).toEqual(team.members)
  })

  it('托管时按届次年份 + 小组过滤后台成员，并按职务排序', () => {
    const managed = [
      makeMember({ id: 'u-1', name: '组员甲', role: '组员', cohort: '2023 届', direction: '项目组' }),
      makeMember({ id: 'u-2', name: '组长乙', role: '组长', cohort: '2023 届', direction: '项目组' }),
      makeMember({ id: 'u-3', name: '外届丙', role: '组长', cohort: '2024 届', direction: '项目组' }),
      makeMember({ id: 'u-4', name: '算法丁', role: '组长', cohort: '2023 届', direction: '算法组' }),
    ]
    expect(mergeManagedTeamMembers(team, managed, '2023', true).map((member) => member.id)).toEqual(['u-2', 'u-1'])
  })
})

describe('Tag / Avatar', () => {
  it('Tag 把 tone 映射成 tag-<tone> 类名', () => {
    render(<Tag tone="blue">算法</Tag>)
    const node = screen.getByText('算法')
    expect(node.className).toBe('tag tag-blue')
  })

  it('Avatar 同时带主题色与尺寸类名', () => {
    render(<Avatar initials="计" accent="rose" size="lg" />)
    expect(screen.getByText('计').className).toBe('avatar avatar-rose avatar-lg')
  })

  it('Avatar 显示头像图片，加载失败时退回姓名缩写', () => {
    const { container } = render(<Avatar initials="小王" name="王小明" avatarUrl="https://cdn.example.com/avatar.webp" />)
    const image = container.querySelector('.avatar img')
    expect(image?.getAttribute('src')).toBe('https://cdn.example.com/avatar.webp')
    if (image) fireEvent.error(image)
    expect(screen.getByText('小明')).toBeTruthy()
  })
})
