import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TeamDetail } from '../api/teams'
import { jsonResponse, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const team = { id: 't1', name: 'Lochinlar', leaderName: 'Aziz Karimov', memberCount: 6 }
const detail: TeamDetail = { id: 't1', name: 'Lochinlar', leaderId: 'u9', members: [] }

describe('Jamoaga qoʻshilish', () => {
  it('shows the team, joins it, then opens Jamoam', async () => {
    const api = stubApi({
      'GET /api/teams/invite/abc': { team, isMember: false },
      'POST /api/teams/join': detail,
      'GET /api/teams/me': [team],
      'GET /api/teams/t1': detail,
    })
    const { router } = renderApp('/join/abc')
    expect(await screen.findByText('Sizni jamoaga taklif qilishdi')).toBeInTheDocument()
    expect(screen.getByText('Lochinlar')).toBeInTheDocument()
    expect(screen.getByText('Sardor: Aziz Karimov · 6 aʼzo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jamoaga qoʻshilish' }))
    expect(await screen.findByText('Siz jamoaga qoʻshildingiz')).toBeInTheDocument()
    expect(api.calls('POST /api/teams/join')).toEqual([{ code: 'abc' }])
    fireEvent.click(screen.getByRole('button', { name: 'Jamoamga oʻtish' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/team'))
    expect(router.state.location.search).toBe('?team=t1')
  })

  it('says so when the user is already a member', async () => {
    const api = stubApi({ 'GET /api/teams/invite/abc': { team, isMember: true } })
    renderApp('/join/abc')
    expect(await screen.findByText('Siz allaqachon shu jamoadasiz')).toBeInTheDocument()
    expect(api.calls('POST /api/teams/join')).toHaveLength(0)
  })

  it('treats a 409 on join as already a member', async () => {
    stubApi({
      'GET /api/teams/invite/abc': { team, isMember: false },
      'POST /api/teams/join': jsonResponse(409, null, 'User is already a member of this team'),
    })
    renderApp('/join/abc')
    fireEvent.click(await screen.findByRole('button', { name: 'Jamoaga qoʻshilish' }))
    expect(await screen.findByText('Siz allaqachon shu jamoadasiz')).toBeInTheDocument()
  })

  it('shows "Havola yaroqsiz" for an unknown or replaced code', async () => {
    stubApi({ 'GET /api/teams/invite/old': jsonResponse(404, null, 'Invite not found') })
    renderApp('/join/old')
    expect(await screen.findByText('Havola yaroqsiz')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bosh sahifaga' })).toBeInTheDocument()
  })

  it('shows "Havola yaroqsiz" when the link is replaced before joining', async () => {
    stubApi({
      'GET /api/teams/invite/abc': { team, isMember: false },
      'POST /api/teams/join': jsonResponse(404, null, 'Invite not found'),
    })
    renderApp('/join/abc')
    fireEvent.click(await screen.findByRole('button', { name: 'Jamoaga qoʻshilish' }))
    expect(await screen.findByText('Havola yaroqsiz')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({
      'GET /api/teams/invite/abc': () =>
        fail ? jsonResponse(400, null, 'Bad request') : { team, isMember: false },
    })
    renderApp('/join/abc')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('Lochinlar')).toBeInTheDocument()
  })
})
