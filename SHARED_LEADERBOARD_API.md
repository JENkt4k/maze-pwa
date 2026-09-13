# InfiMaze shared leaderboard API v1

The shared leaderboard is optional. The PWA only contacts this service after the
player enables shared leaderboards. Configure the client with
`VITE_SHARED_LEADERBOARD_URL`; an unset value leaves the feature unavailable.

## Privacy boundary

The client submits a display name, deterministic maze parameters, maze ID, and
final time/move/revisit totals. It does not submit the player's route, drawings,
custom marker images, play history, device identifiers, or contact information.

## Read scores

`GET /v1/leaderboards/{mazeId}?sort=time|moves&limit=50`

Response:

```json
{"version":1,"mazeId":"…","entries":[{"id":"…","name":"Player","elapsedMs":12345,"moves":80,"revisits":4,"submittedAt":1789257600000}]}
```

## Submit a score

`POST /v1/submissions`

```json
{
  "version": 1,
  "submissionId": "client-generated UUID",
  "name": "Player",
  "mazeId": "deterministic fingerprint",
  "params": {"width":19,"height":19,"seed":42,"g":0.3,"b":0.15,"tau":0.4,"generator":"dfs","topology":"grid"},
  "elapsedMs": 12345,
  "moves": 80,
  "revisits": 4
}
```

Successful responses use status `201` and return the accepted leaderboard entry.
Repeated `submissionId` values are idempotent. Invalid or unverifiable scores use
`422`; throttled clients use `429`.

## Backend requirements

- Rebuild the maze from the submitted parameters and confirm its fingerprint.
- Reject impossible totals, incomplete solutions, unsupported algorithms, and
  oversized request bodies.
- Normalize names to plain text, 1–24 characters, and provide a moderation path.
- Rate-limit by a rotating, one-way network identifier; do not expose it in API
  responses or retain raw network addresses longer than operationally necessary.
- Permit CORS only from configured InfiMaze origins.
- Return JSON errors as `{ "error": "safe user-facing message" }`.

