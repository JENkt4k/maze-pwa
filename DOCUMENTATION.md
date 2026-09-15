# InfiMaze documentation map

| Document | Audience | Authority |
| --- | --- | --- |
| [README](README.md) | New users and contributors | Product summary, setup, architecture, and verification entry point |
| [User manual](USER_MANUAL.md) | Maze players, authors, teachers, and robot experimenters | Current operating instructions and screenshots |
| [Feature status](FEATURE_STATUS.md) | Product owners and reviewers | Current completion boundary, evidence, constraints, and deferrals |
| [Roadmap](ROADMAP.md) | Product planning | Active milestone and ordered backlog |
| [Evolution record](EVOLUTION.md) | Maintainers and project historians | Dated feature history and recorded model/tool maturity |
| [PWA release checklist](PWA_RELEASE_CHECKLIST.md) | Release operators | Production and physical-device checks |
| [Shared leaderboard API](SHARED_LEADERBOARD_API.md) | Future service implementers | Deferred hosted API and safety contract |

## Historical engineering plans

The following files record the decisions and acceptance criteria for completed milestones. Their checklists are historical evidence rather than the current roadmap:

- [Stabilization](IMPLEMENTATION_PLAN.md)
- [Solver playback](SOLVER_PLAYBACK_PLAN.md)
- [Shaped mazes](SHAPED_MAZE_PLAN.md)
- [Custom masks](CUSTOM_MASK_PLAN.md)
- [Endpoint editor](ENDPOINT_EDITOR_PLAN.md)
- [Curved rendering](CURVED_RENDERING_PLAN.md)
- [Gameplay](GAMEPLAY_PLAN.md)
- [Freeform graphs](FREEFORM_GRAPH_PLAN.md)
- [Micromouse](MICROMOUSE_PLAN.md)
- [Play history](PLAY_HISTORY_PLAN.md)
- [Leaderboards](LEADERBOARD_PLAN.md)
- [Difficulty 2.0](DIFFICULTY_2_PLAN.md)
- [Performance](PERFORMANCE.md)

Screenshots in `docs/images/` are regenerated with `npm run docs:capture` while the Vite development server is available at `http://127.0.0.1:5173/`.
