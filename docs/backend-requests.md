# Backend Requests

Things the frontend needs from `../minipolyaBackend` that do not exist yet.

The backend is the source of truth and is read-only for frontend work, so when
a screen needs an endpoint, a field or a status value that the API does not
provide, **it gets written down here instead of being worked around in the
client.** No inventing endpoints, no guessing field names, no recomputing a
business rule client-side to paper over a missing value.

**How to use this file**

1. Before adding an entry, check `docs/api-reference.md` — including its
   **"Questions about the backend"** section, which already lists known gaps
   and inconsistencies found while reading the backend. If what you need is
   already a question there, turn it into a request here with the concrete
   shape the frontend wants.
2. Copy the template below, fill in every field, and add it under
   **Open requests**.
3. Keep the proposed shape consistent with what the backend already does: the
   `{ success, data, message }` envelope, `{ content, page, size, totalElements, totalPages }`
   for lists, UUID string ids, **tiyin** for money, **UTC** timestamps,
   lowercase enum values, `dayOfWeek` 0 = Monday.
4. When the backend ships it, update `docs/api-reference.md` from the new
   commit and move the entry to **Done**.

---

## Template

```markdown
### R<n> — <short title>

**What's needed**
What the frontend cannot do today, and why the existing API does not cover it.

**Which screen needs it**
The screen or flow that is blocked, and which frontend (Mini App player /
Mini App owner mode / admin panel).

**Proposed endpoint**
`<METHOD> /api/<path>` — access level (public / logged-in user / owner / admin)

Request — path and query parameters, and body fields with types, required or
optional, and validation rules:

| Field | Type | Required | Validation |
|---|---|---|---|
| | | | |

Response — `data` payload with field types (mark money **tiyin** and
timestamps **UTC**):

| Field | Type | Notes |
|---|---|---|
| | | |

Error cases — HTTP status and message for each failure the frontend must
handle.

**Priority**
Blocker / High / Medium / Low — plus one line on what it blocks or degrades.
```

---

## Open requests

_None yet._

---

## Done

_None yet._
