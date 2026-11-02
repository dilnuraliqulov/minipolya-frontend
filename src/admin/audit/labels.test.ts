import { describe, expect, it } from 'vitest'
import { actionLabel, fieldLabel, formatAuditValue } from './labels'

describe('audit labels', () => {
  it.each([
    ['OWNER_LEGAL_DETAILS_CHANGED', 'Egasining yuridik maʼlumotlarini oʻzgartirdi'],
    ['STADIUM_NOTE_ADDED', 'Maydonga ichki izoh qoʻshdi'],
    ['PROFILE_UPDATED', 'Profilini yangiladi'],
    ['PHONE_SHARED_VIA_BOT', 'Telefon raqamini bot orqali yubordi'],
  ])('labels %s', (code, label) => {
    expect(actionLabel(code)).toBe(label)
  })

  it('shows an unknown code as the code', () => {
    expect(actionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })

  it('labels the fields those actions write', () => {
    expect(fieldLabel('firstName')).toBe('Ism')
    expect(fieldLabel('lastName')).toBe('Familiya')
    expect(fieldLabel('phoneChanged')).toBe('Telefon oʻzgardi')
    expect(fieldLabel('noteId')).toBe('Izoh')
    expect(fieldLabel('tin')).toBe('STIR / JShShIR')
    expect(formatAuditValue('language', 'ru')).toBe('Ruscha')
    expect(formatAuditValue('legalType', 'mchj')).toBe('MChJ')
    expect(formatAuditValue('atmosContractStatus', 'signed')).toBe('Imzolangan')
    expect(formatAuditValue('phoneChanged', true)).toBe('Ha')
  })
})
