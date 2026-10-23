# WordCraft architecture and data contracts

Production uses native ES modules without a build. main.js coordinates the pure rules, validated storage and UI. No browser globals are required by the pure scoring, scheduling, hard-mode and statistics modules. UI event handlers use one input path with an animation lock. DOM updates compare values before writing.

## Phase 2 API

- `normalizeWord(input)` returns lowercase five-letter ASCII text or null. ASCII case and outer whitespace are accepted. Unicode lookalikes are rejected.
- `validateWord(input, allowedGuesses?)` returns `{ valid, word, code, message }`. The default dictionary is private-set backed. Tests can inject a normalized array or Set.
- `scoreGuess(guess, answer)` returns five frozen states: `correct`, `present`, `absent`. It scores greens before allocating yellows. It checks shape but intentionally does not require dictionary membership, so rules can be tested independently.
- `createGame(answer, { hardMode?, allowedGuesses? })` returns frozen state with `answer`, `hardMode`, empty `guesses`, and status `playing`. An answer must be allowed. Mode selection uses the separate curated ANSWERS list.
- `submitGuess(state, input, allowedGuesses?)` returns `{ ok, state, code, message }`, plus feedback on acceptance or violations for a Hard Mode error. Keep the same injected dictionary for creation and submissions. Failed guesses preserve state identity and consume no attempts. Valid repeated guesses consume attempts. A correct sixth guess wins. Six incorrect guesses lose. Completed states reject further guesses.
- `deriveConstraints(history)` returns frozen green positions, excluded positions, minimum counts, and inferred maximum counts. A row is `{ word, feedback }`. History uses lowercase words and five feedback states, as produced by the engine.
- `validateHardMode(word, history)` accepts an already-normalized candidate and returns `{ valid, violations }`. It evaluates all revealed rows, never the secret answer. Violation positions are zero-based, while human-readable messages use positions 1–5.
- `getKeyboardState(history)` returns the strongest known state per letter. Later feedback cannot downgrade an existing clue.

The pure engine consumes states it created, not arbitrary saved objects. Phase 3 storage restoration validates and replays saved guesses before passing them into the engine. No browser globals or I/O occur in the Phase 2 rules modules.

## Phase 3 controller API

`createController(options?)` from js/main.js coordinates the Phase 3 state. Options inject a clock, storage adapter, random providers, unlimited ID factory, and onChange callback for tests and the current UI.

- `getState()` returns a deeply frozen document containing activeMode, settings, daily, unlimited, expiredDaily, completions, and per-mode statistics.
- `getGame()` rebuilds the active session through the Phase 2 scoring engine. It returns derived feedback rather than trusting stored scores.
- `getStatistics(mode?)` returns gamesPlayed, gamesWon, rounded winPercentage, currentStreak, maximumStreak, and six guessDistribution buckets.
- `selectMode('daily' | 'unlimited')` preserves each mode's existing progress. The first unlimited selection creates a puzzle.
- `newUnlimited()` selects a fresh answer, avoiding an immediate repeat when possible. It abandons unfinished progress without recording a loss.
- `setInput(text)` saves up to five ASCII letters, lowercased. `guess(text?)` submits explicit text or saved input. Invalid submissions consume no attempt. A stale daily submission detected at midnight returns day-changed.
- `setPreferences({ theme?, sound?, hardMode? })` validates settings. Hard Mode activation requires zero accepted guesses in the active unfinished puzzle. Disabling it sets an irreversible puzzle opt-out. Preferences changed after completion affect future puzzles, preserving completed eligibility.
- `checkDay()` expires unfinished old daily progress, loads today's puzzle, resets its typed input, updates statistics, and announces a UTC day change. It does not erase unlimited progress.
- `synchronize(raw?)` merges validated external progress and completion records without echoing a storage-event write. Call it with a storage event's newValue or omit it to read the adapter.
- `getStorageStatus()` reports the last save status, including unavailable or too-large. Play continues in memory on persistence failure.

`attachLifecycle(controller, dependencies)` wires focus, visibility restoration, storage events, and a 30-second check. It returns cleanup for listeners and timer. Browser bootstrap starts this coordinator, mounts the complete interface, and wires lifecycle updates to the rendered game. Pure engine and persistence rules are reused.

## Daily schedule and data format

The immutable schedule is [documented separately](assets/DAILY_SCHEDULE.md). It uses UTC ordinals, a fixed 2026-01-01 epoch, a frozen v1 answer snapshot, and an affine permutation. It visits all 821 v1 answers in each 821-day cycle, including dates before the epoch. Schedule tests pin the exact snapshot checksum and a golden date. Future dictionary edits must not change v1 mappings or remove scheduled answers from allowed guesses.

Local Storage key: `wordcraft:state`. Schema version: 1. Phase 2 did not ship persisted gameplay, so no prior gameplay schema migration is needed. Unsupported schema versions recover to defaults. A future version requires an explicit migration.

Each session saves puzzle identity, answer, UTC daily date/schedule version where applicable, accepted words with the Hard Mode flag used for each guess, typed input, status, completion timestamp, generation, revision, current enforcement, and hard-mode opt-out/eligibility. Saved feedback is ignored and rebuilt. Current sessions and the completion ledger are written in one JSON document. Counters are saved for convenience but recomputed from the validated completion ledger on restore. Valid terminal current sessions repair a missing completion record once.

Daily streaks use consecutive UTC puzzle dates, including yesterday's streak while today remains unplayed. Skipping a day or losing breaks the current streak. Unlimited streaks use completed puzzle generations, then timestamp/ID tie breaks for concurrent games. Abandonments do not break them. Wins alone enter the distribution.

Multi-tab reconciliation unions completion identities, keeps committed results, favors longer accepted progress and newer revisions, and retains the newer unlimited generation. Each tab keeps its own selected mode. Local Storage cannot provide atomic cross-tab transactions. Simultaneous conflicting branches and preferences use deterministic best-effort resolution, not guaranteed synchronization. Separate devices never share progress.

The adapter caps a serialized document at 4 MiB of text, and browsers impose their own storage quotas. No completion history is intentionally pruned, so heavy use can eventually exhaust space. A failed write keeps the in-memory session playable but cannot guarantee refresh recovery. Clearing this origin's `wordcraft:state` key resets saved progress and statistics. Clocks and saved data are editable, and this is not an anti-cheat system.

