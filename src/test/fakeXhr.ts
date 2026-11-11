import { vi } from 'vitest'

export interface FakeXhrRequest {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
  /** Reports upload progress (0–1) to the page. */
  progress: (fraction: number) => void
}

/** A reply: data for a 200 envelope, an error status with a message, or a dropped connection. */
export type FakeXhrReply = { status?: number; data?: unknown; message?: string } | 'network'

/**
 * Replaces `XMLHttpRequest` (used only for uploads with progress) with a fake
 * that hands each request to `handler` and answers with the backend's envelope.
 * The handler may return a promise to hold the answer back.
 */
export function installFakeXhr(
  handler: (request: FakeXhrRequest) => FakeXhrReply | Promise<FakeXhrReply>,
) {
  const requests: FakeXhrRequest[] = []

  class FakeXMLHttpRequest {
    upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
    status = 0
    statusText = ''
    responseText = ''
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    ontimeout: (() => void) | null = null
    onabort: (() => void) | null = null
    private method = 'GET'
    private url = ''
    private headers: Record<string, string> = {}
    private aborted = false

    open(method: string, url: string) {
      this.method = method
      this.url = url
    }

    setRequestHeader(name: string, value: string) {
      this.headers[name] = value
    }

    abort() {
      this.aborted = true
      this.onabort?.()
    }

    send(body: unknown) {
      const request: FakeXhrRequest = {
        method: this.method,
        url: this.url,
        headers: this.headers,
        body,
        progress: (fraction) =>
          this.upload.onprogress?.({
            lengthComputable: true,
            loaded: fraction * 100,
            total: 100,
          } as ProgressEvent),
      }
      requests.push(request)
      void Promise.resolve()
        .then(() => handler(request))
        .then((reply) => {
          if (this.aborted) return
          if (reply === 'network') {
            this.onerror?.()
            return
          }
          const status = reply.status ?? 200
          const ok = status >= 200 && status < 300
          this.status = status
          this.responseText = JSON.stringify({
            success: ok,
            data: reply.data ?? null,
            message: reply.message ?? null,
          })
          this.onload?.()
        })
    }
  }

  vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest)
  return { requests }
}
