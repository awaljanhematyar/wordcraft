# WordCraft immutable daily schedule v1

Identity: daily-v1. Epoch: 2026-01-01 UTC. Supported calendar dates: years 1000–9999.

The separately frozen js/daily-answers-v1.js contains 821 words copied from the independently curated Phase 2 WordCraft ANSWERS subset, not the proprietary Wordle answer list. Source: Wordnik wordlist-20210729, MIT, Copyright (c) 2020 Wordnik. Preserve WORDNIK_LICENSE.txt with redistributed data. See WORD_LIST_PROVENANCE.md for the exact upstream revision and permission notice.

The SHA-256 of the canonical newline-separated v1 snapshot with a trailing newline is:

2295b5870b882fa0cb0f3bc162246c18aebceb97398994fd05922513de16c617

Algorithm:

1. Interpret the current instant with Date's UTC components. Never parse an ambiguous local date string.
2. Validate the YYYY-MM-DD calendar date and compute its Date.UTC ordinal in 86,400,000 ms days.
3. Subtract the epoch ordinal.
4. Calculate index = ((offset × 317 + 113) modulo 821 + 821) modulo 821.
5. Read the answer at that index from DAILY_ANSWERS_V1.

317 and 821 are coprime, so every answer appears once per 821-day cycle. A UTC date's identity is daily-v1:YYYY-MM-DD. Golden mapping: 2026-10-23 selects arena. Tests pin the snapshot, epoch, permutation coverage before and after the epoch, and this golden mapping.

## Future release rule

Never edit the v1 snapshot, multiplier, additive offset, epoch, or identity. Editing the current general ANSWERS list must not affect existing daily puzzles. Keep every v1 answer in the allowed-guesses dictionary so it remains playable. CI tests deliberately reject changes to the v1 snapshot checksum and mapping.

If a new daily schedule is required, preserve v1 for every date before a separately documented UTC cutover, introduce a new version/data module for future dates, and explicitly migrate saved daily identity and progress. Shipping an app release must never silently remap a date. No new schedule or migration is implemented in Phase 3.

Daily selection is a predictable browser-local algorithm. Answers and future dates can be inspected in source. Device clocks may be altered. This is not a backend daily service or synchronized multiplayer.
