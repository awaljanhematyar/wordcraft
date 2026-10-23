# WordCraft dictionary provenance

## Primary source and permission

Publisher: Wordnik. Repository: https://github.com/wordnik/wordlist

Exact revision: `46e6215d0f90356afe9c8ba4be347e7e98cb425c`

Data: https://raw.githubusercontent.com/wordnik/wordlist/46e6215d0f90356afe9c8ba4be347e7e98cb425c/wordlist-20210729.txt

License: https://raw.githubusercontent.com/wordnik/wordlist/46e6215d0f90356afe9c8ba4be347e7e98cb425c/LICENSE

The pinned repository describes this as an open-source word list for game developers. Its MIT license permits use, modification, redistribution, and commercial use, subject to including the copyright and permission notice with copies or substantial portions. The complete unmodified notice is bundled as WORDNIK_LICENSE.txt and must remain with the redistributed word data. This permission applies to this open-source list, not other Wordnik datasets or API services.

Retrieved: 2026-10-23. The exact byte hashes, source count, derived counts, and derived-list hashes are recorded in WORD_LIST_MANIFEST.json. There is no runtime fetch or dependency on Wordnik.

## Transformations and independent curation

1. Decode the pinned UTF-8 file. Each nonempty line is a JSON string literal.
2. Decode each line with JSON parsing. Strip outer whitespace.
3. Accept only strings matching ASCII `[A-Za-z]{5}`. Reject malformed, non-ASCII, punctuated, or other-length entries. Do not transliterate or strip punctuation to invent new entries.
4. Lowercase, deduplicate, and lexicographically sort the result. Export the frozen list as ALLOWED_GUESSES in js/words.js.
5. Independently select familiar words for WordCraft from this licensed dictionary, avoiding specialist terms and intentionally avoiding offensive answers. Sort and deduplicate this subset. Export it as the separate frozen ANSWERS list. No Wordle answer list or ordering was consulted or imported.
6. Test that every answer is an allowed guess. Keep this list version and ordering stable. Daily scheduling now uses a separately frozen v1 snapshot. See DAILY_SCHEDULE.md for the immutable mapping contract.

Source entries: 198422. Allowed guesses: 11846. Curated answers: 821.

To reproduce the broad list, download the exact pinned data, verify source_sha256, and apply steps 1–4. The curated subset is explicitly stored in js/words.js and its canonical newline-separated checksum is pinned in the manifest. Verify the bundled license checksum too. Generation was a one-time source preparation operation, not a frontend build process.

## Editorial limits

The allowed dictionary contains uncommon words, inflections, regional spellings, and potentially sensitive terms. Acceptance means membership in the pinned list, not a promise of universal dictionary coverage. Answer curation is a finite initial selection and can be reviewed further before release. Removing or adding answers later requires a versioned schedule migration once daily play ships.
