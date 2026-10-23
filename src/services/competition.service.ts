import { apiConfig, apiRequest } from './api-client'
import type { CompetitionEvent } from '../types'

const REMINDERS_STORAGE_KEY = 'club-competition-reminders-v1'

export interface CompetitionReminder {
  competitionId: string
  enabled: boolean
  createdAt?: string
}

function parseParts(value?: string) {
  const raw = value?.trim()
  if (!raw) return undefined
  const match = raw.match(/^(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})(?:日)?(?:[T\s]+(\d{1,2})(?::(\d{2}))?(?::(\d{2})(?:\.\d+)?)?)?(Z|[+-]\d{2}:\d{2})?$/)
  if (!match) return undefined
  const year = Number(match[1] ?? new Date().getFullYear())
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4] ?? 0)
  const minute = Number(match[5] ?? 0)
  const second = Number(match[6] ?? 0)
  if (hour > 23 || minute > 59 || second > 59) return undefined
  const result = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (Number.isNaN(result.getTime()) || result.getMonth() !== month - 1 || result.getDate() !== day) return undefined
  const zoned = match[7] ? new Date(raw) : new Date(year, month - 1, day, hour, minute, second)
  return Number.isNaN(zoned.getTime()) ? undefined : zoned
}

/** Parses the date formats accepted by the editor without introducing UTC day shifts. */
export function parseCompetitionDate(value?: string) {
  return parseParts(value)
}

/** Returns whether any confirmed competition timetable node has been entered. */
export function hasCompetitionSchedule(event: Pick<CompetitionEvent, 'registrationStart' | 'registrationEnd' | 'eventStart' | 'date' | 'eventEnd' | 'resultDate'>) {
  return [event.registrationStart, event.registrationEnd, event.eventStart ?? event.date, event.eventEnd, event.resultDate]
    .some((value) => Boolean(value?.trim()))
}

/** Date nodes are intentionally optional because organizers often publish schedules late. */
export function competitionSaveValidationError(value: { title: string; description: string; tracks?: Array<{ name: string }> }) {
  if (!value.title.trim()) return '请填写比赛名称。'
  if (!value.description.trim()) return '请填写比赛简介；赛程时间尚未确定时可以留空。'
  if (value.tracks?.some((track) => !track.name.trim())) return '请填写每个赛道的名称，或删除未使用的赛道。'
  return undefined
}

/** Sends blank date fields explicitly so PATCH can clear previously saved dates. */
export function competitionSchedulePayload(value: {
  registrationStart: string
  registrationEnd: string
  eventStart: string
  eventEnd: string
  resultDate: string
}) {
  const eventStart = value.eventStart.trim()
  const registrationEnd = value.registrationEnd.trim()
  return {
    registrationStart: value.registrationStart.trim(),
    registrationEnd,
    eventStart,
    eventEnd: value.eventEnd.trim(),
    resultDate: value.resultDate.trim(),
    // Keep legacy aliases in sync; empty strings intentionally clear them too.
    date: eventStart,
    deadline: registrationEnd,
  }
}

export function competitionDateInput(value?: string) {
  const date = parseCompetitionDate(value)
  if (!date) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function competitionDateLabel(value?: string) {
  const date = parseCompetitionDate(value)
  if (!date) return value?.trim() ?? ''
  const pad = (part: number) => String(part).padStart(2, '0')
  const time = date.getHours() || date.getMinutes() ? ` ${pad(date.getHours())}:${pad(date.getMinutes())}` : ''
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}${time}`
}

export interface CompetitionMilestone {
  label: string
  date: Date
}

export function competitionNextMilestone(event: CompetitionEvent, now = new Date()): CompetitionMilestone | undefined {
  const milestones: CompetitionMilestone[] = [
    { label: '报名开始', date: parseCompetitionDate(event.registrationStart) },
    { label: '报名截止', date: parseCompetitionDate(event.registrationEnd) },
    { label: '比赛开始', date: parseCompetitionDate(event.eventStart ?? event.date) },
    { label: '比赛结束', date: parseCompetitionDate(event.eventEnd) },
    { label: '结果公布', date: parseCompetitionDate(event.resultDate) },
  ].filter((milestone): milestone is CompetitionMilestone => Boolean(milestone.date && milestone.date > now))

  return milestones.sort((a, b) => a.date.getTime() - b.date.getTime())[0]
}

export function competitionStage(event: CompetitionEvent, now = new Date()): CompetitionEvent['status'] {
  if (event.lifecycle === 'draft') return '草稿'
  if (!hasCompetitionSchedule(event)) return '即将开始'
  const registrationStart = parseCompetitionDate(event.registrationStart)
  const registrationEnd = parseCompetitionDate(event.registrationEnd)
  const eventStart = parseCompetitionDate(event.eventStart ?? event.date)
  const eventEnd = parseCompetitionDate(event.eventEnd)
  const resultDate = parseCompetitionDate(event.resultDate)
  if (resultDate && now >= resultDate) return '已结束'

  if (eventStart && now < eventStart) {
    if (registrationStart && now < registrationStart) return '即将报名'
    if (registrationEnd && now < registrationEnd) return '报名中'
    if (registrationEnd && now >= registrationEnd) return '报名已截止'
    if (registrationStart && now >= registrationStart) return '报名中'
    if (!registrationStart && !registrationEnd) return '即将开始'
    return event.status
  }

  if (eventStart && now >= eventStart) {
    if (eventEnd && now < eventEnd) return '比赛进行中'
    if (eventEnd && now >= eventEnd) return resultDate && now < resultDate ? '等待结果' : '已结束'
    if (resultDate && now < resultDate) return '等待结果'
    return '比赛进行中'
  }

  if (eventEnd && now >= eventEnd) return resultDate && now < resultDate ? '等待结果' : '已结束'
  if (registrationStart && now < registrationStart) return '即将报名'
  if (registrationStart && now >= registrationStart) return '报名中'
  if (registrationEnd && now < registrationEnd) return '报名中'
  if (registrationEnd && now >= registrationEnd) return '报名已截止'
  return event.status
}

function localRemindersKey(ownerId: string) {
  return `${REMINDERS_STORAGE_KEY}:${encodeURIComponent(ownerId)}`
}

function readLocalReminders(ownerId: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(localRemindersKey(ownerId)) ?? '{}')
    return value && typeof value === 'object' ? value as Record<string, CompetitionReminder> : {}
  } catch {
    return {}
  }
}

function writeLocalReminders(ownerId: string, reminders: Record<string, CompetitionReminder>) {
  try { window.localStorage.setItem(localRemindersKey(ownerId), JSON.stringify(reminders)) } catch { /* Storage may be unavailable. */ }
}

export async function getCompetitionReminder(competitionId: string, ownerId: string) {
  if (apiConfig.contentSource === 'api') {
    return apiRequest<CompetitionReminder>(`/competitions/${encodeURIComponent(competitionId)}/reminder`, {
      method: 'GET',
      withAuth: true,
    })
  }

  return readLocalReminders(ownerId)[competitionId] ?? { competitionId, enabled: false }
}

export async function setCompetitionReminder(competitionId: string, enabled: boolean, ownerId: string) {
  if (apiConfig.contentSource === 'api') {
    return apiRequest<CompetitionReminder>(`/competitions/${encodeURIComponent(competitionId)}/reminder`, {
      method: 'POST',
      body: { enabled },
      withAuth: true,
    })
  }

  const reminders = readLocalReminders(ownerId)
  const reminder = { competitionId, enabled, createdAt: new Date().toISOString() }
  reminders[competitionId] = reminder
  writeLocalReminders(ownerId, reminders)
  return reminder
}
