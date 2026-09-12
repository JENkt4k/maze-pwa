# Play history plan

## Scope

- [x] Record every human gameplay attempt from its first Play action.
- [x] Treat Restart as abandoning the current attempt and starting another.
- [x] Mark unfinished attempts abandoned when their maze changes.
- [x] Store a stable maze fingerprint, complete maze parameters, timestamps,
  elapsed time, moves, revisits, status, and route.
- [x] Restore an exact maze and its recorded gameplay state from history.
- [x] Provide All, Completed, and Unfinished views with reopen, delete, and clear.
- [x] Keep data local and available offline with defensive parsing and a storage cap.
- [x] Leave ranking and leaderboard views for the next PR.
- [x] Validate storage migration/failure behavior and desktop/mobile interaction at
  feature completion.

