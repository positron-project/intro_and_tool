import { describe, expect, it } from 'vitest'
import { competitionSaveValidationError, competitionSchedulePayload, competitionStage, hasCompetitionSchedule, parseCompetitionDate } from './competition.service'

describe('competition schedule flexibility', () => {
  it.each(['2026-10-23T12:60', '2026-10-23T24:00', '2026-10-23T12:00:60', '2026-02-30', '2026-10-23garbage'])('rejects invalid dates instead of silently normalizing %s', (value) => {
    expect(parseCompetitionDate(value)).toBeUndefined()
  })

  it('preserves seconds and timezone offsets in backend timestamps', () => {
    expect(parseCompetitionDate('2026-10-23T12:30:45+08:00')?.getTime()).toBe(new Date('2026-10-23T04:30:45Z').getTime())
    expect(parseCompetitionDate('2026年10月23日 12:30')?.getHours()).toBe(12)
  })
  it('allows saving a competition while its schedule is unpublished', () => {
    expect(competitionSaveValidationError({ title: '蓝桥杯', description: '赛事简介', tracks: [] })).toBeUndefined()
    const event = { date: '', registrationStart: '', registrationEnd: '', eventEnd: '', resultDate: '' }
    expect(hasCompetitionSchedule(event)).toBe(false)
    expect(competitionStage({ ...event, id: 'competition-1', title: '蓝桥杯', type: '程序设计', deadline: '', description: '赛事简介', status: '已结束', accent: 'blue', createdAt: '', updatedAt: '', lifecycle: 'published' }, new Date('2026-01-01'))).toBe('即将开始')
  })

  it('still requires the competition title, description, and names for any added tracks', () => {
    expect(competitionSaveValidationError({ title: '', description: '赛事简介' })).toBe('请填写比赛名称。')
    expect(competitionSaveValidationError({ title: '蓝桥杯', description: '' })).toBe('请填写比赛简介；赛程时间尚未确定时可以留空。')
    expect(competitionSaveValidationError({ title: '蓝桥杯', description: '赛事简介', tracks: [{ name: ' ' }] })).toBe('请填写每个赛道的名称，或删除未使用的赛道。')
  })

  it('sends empty dates explicitly so saved dates can be cleared', () => {
    expect(competitionSchedulePayload({ registrationStart: '', registrationEnd: '', eventStart: '', eventEnd: '', resultDate: '' })).toEqual({
      registrationStart: '',
      registrationEnd: '',
      eventStart: '',
      eventEnd: '',
      resultDate: '',
      date: '',
      deadline: '',
    })
  })

  it('reports registration closed after the deadline but before the event starts', () => {
    const event = {
      id: 'competition-2', title: '蓝桥杯', type: '程序设计',
      date: '2026-12-01T09:00', deadline: '2026-10-01T23:59',
      eventStart: '2026-12-01T09:00', registrationEnd: '2026-10-01T23:59',
      description: '赛事简介', status: '报名中' as const, accent: 'blue',
      createdAt: '', updatedAt: '', lifecycle: 'published' as const,
    }
    expect(competitionStage(event, new Date('2026-10-18T00:00:00'))).toBe('报名已截止')
  })

  it('treats a started event with no published end date as in progress', () => {
    const event = {
      id: 'competition-3', title: '蓝桥杯', type: '程序设计',
      date: '2026-10-01T09:00', deadline: '', eventStart: '2026-10-01T09:00',
      description: '赛事简介', status: '即将开始' as const, accent: 'blue',
      createdAt: '', updatedAt: '', lifecycle: 'published' as const,
    }
    expect(competitionStage(event, new Date('2026-10-18T00:00:00'))).toBe('比赛进行中')
  })
})
