# Google Play production access — application answers

Drafted 2026-11-23 from the closed-test git history (first Play upload 2026-11-05,
six consumed versionCodes through 2026-11-19). Paste the two answers below into
the console; the evidence appendix is for reference only.

## What changes did you make to your game based on what you learned during your closed test?

During the closed test I shipped six updates between 5 and 19 November, each driven
by tester feedback and my own play sessions:

- Fairer controls: testers reported that some taps felt like unfair misses, so I
  widened the effective tap area (a little larger on touch screens) while keeping
  misses meaningful so the game stays challenging, and hid keyboard hints on
  touch-only devices.
- Phone readability: I moved the combo meter out of the top centre — where modern
  phones have the front-camera notch — to below the score, matched the Android
  menu font weight to the web version, and removed button focus rings.
- More engaging scoring: the old combo cap was reached in almost every run, so I
  raised it to x25 with a chain window that tightens step by step, rewarding
  sustained skill.
- Bugs testers found: in Climb mode a shield now destroys the saw it blocked
  (previously the saw stayed intact and could kill you next frame), and the Daily
  best score now resets to zero each day instead of carrying over.
- Clearer presentation: I rewrote the instructions in plain, casual language
  without technical numbers, and made the Daily mode visibly remix the rules every
  day, showing the day's three biggest twists in the menu.
- Install and offline: I added PWA support with iOS-specific install guidance so
  iPhone/iPad users can install it fullscreen and play offline.

## How did you decide that your game is ready for production?

I ran the closed test as a feedback-fix-reverify loop. Every reported issue was
fixed and turned into a permanent automated regression check: the headless test
suite grew from about 440 to 539 assertions, runs on every build, and includes a
rendered-frame check that the shipped game actually animates. The final rounds
produced only polish requests (wording, daily variety) rather than new functional
or stability bugs, and I confirmed the earlier fixes in live play.

The game is also low-risk by construction: a single self-contained HTML file in a
minimal WebView wrapper with no INTERNET permission, no ads, no tracking, no
accounts, no purchases and no third-party code. It collects no data and works
fully offline. I verified real captures of the shipped build on phone, 7-inch and
10-inch tablet and desktop form factors, and tested the Android wrapper on device;
it supports Android 7.0 and up. Every difficulty ramp and pickup effect has an
explicit cap, so runs stay fair and predictable.

With all tester feedback addressed, no open stability or fairness issues, and the
full regression suite green on the final build, I judged the game ready for
production.

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