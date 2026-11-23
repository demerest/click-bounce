# Google Play production access — application answers

Drafted 2026-11-23 from the closed-test git history (first Play upload 2026-11-05,
six consumed versionCodes through 2026-11-19). Paste the two answers below into
the console; the evidence appendix is for reference only. Condensed to the
300-character console cap (298 / 295 chars), iOS excluded as not relevant.

## What changes did you make to your game based on what you learned during your closed test?

Six closed-test updates from tester feedback: wider tap area so misses feel fair; combo meter moved below the score (camera notch); combo cap raised to x25 with tighter timing; Climb shield now destroys the saw it blocks; Daily best resets each day; plain-language instructions; bolder daily remix.

## How did you decide that your game is ready for production?

Every tester issue was fixed and became a regression test: the suite grew from 440 to 539 checks, run on each build. Last rounds: polish only, no bugs. Single-file game: no network, ads, tracking or accounts; offline; no data collected. Verified on phone, tablets, desktop and on-device Android.

## Evidence appendix (reference only)

| Date | Commit | Closed-test change |
|---|---|---|
| 11-05 | 782aa30 / 4df0bb3 | first Play uploads; hosted privacy policy + in-app link |
| 11-07 | d4b7f43 | playtest round 1: wider touch-aware tap hitbox; PC hints hidden on touch |
| 11-07 | ebfc32e | launcher icon = store icon (v3) |
| 11-10 | d81277b | playtest round 2: combo x25 + shrinking window; phone combo meter under score; Android font parity (v4) |
| 11-13 | 5170376 | playtest round 3: climb shield destroys saw; no focus rings; Apple PWA install hint (v5) |
| 11-13 | 6c732be | tablet / desktop / Play Games PC store captures |
| 11-16 | e8c8170 | casual plain-language menu copy (v6) |
| 11-19 | 8c3b6a5 | daily remix pronounced + per-day best (stale-best bug) |
| 11-19 | d9a78fd | v7 AAB re-cut after v6 upload |

Regression suite: 440 assertions (2026-11-01) -> 535 (round 3) -> 539 (daily round),
run by tools/verify.ps1 on every build; playtest bugs carry labeled assertions.