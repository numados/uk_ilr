# ILR Absence Calculator

A browser-based tool to track absence days for ILR (Indefinite Leave to Remain) requirements in the UK — including the Global Talent route. Tracks the current rolling 12-month window and the historical worst-case window across the entire residence period.

**Live app**: [numados.github.io/uk_ilr](https://numados.github.io/uk_ilr/)

## Features

- **Multiple profiles**: Create, rename, delete, and switch between profiles for different people
- **Per-profile export / import**: Export a single profile as JSON; import single-profile or legacy multi-profile files with conflict detection
- **Trailing 12-month chart**: SVG line chart showing how absence days evolved over time with a hover tooltip
- **Year-per-row timeline**: Day-by-day strip highlighting presence, absence, future dates, and the current rolling window
- **Configurable timeline length**: Choose how many years the strip and chart cover (persisted in localStorage)
- **Absence summary**:
  - Days absent in the current rolling 12 months
  - Remaining days before the 180-day limit
  - Days until the rolling window drops the earliest counted trip
  - Worst historical 12-month window (dates + whether it breached the limit)
  - Total days in UK vs total days since first entry
- **Trip management**: Add, edit, and delete trips; open-ended trips (no return date) are supported

## File Structure

```
uk_ilr/
├── index.html           # UI and styles
├── js/
│   ├── calculations.js  # Pure date and absence calculation logic (no DOM)
│   └── app.js           # Profile persistence, UI, and event handling
└── README.md
```

`calculations.js` is DOM-free — it can be imported or reviewed independently of the UI.

## Setup

Open `index.html` directly in a browser, or use the hosted GitHub Pages URL above. No build step, no dependencies.

## How to Use

1. **Create a profile** — enter a name and click "Create Profile"
2. **Set first entry date** — the date you first entered the UK; save the profile
3. **Add trips** — departure date (day you left the UK) and return date (day you came back); leave return empty for an ongoing trip
4. **Read the summary** — absence counts, remaining allowance, and worst historical window update instantly
5. **Adjust the current date** — change the reference date to simulate future or past snapshots
6. **Export / Import** — back up or transfer a profile as JSON

## Profile JSON Format

```json
{
  "name": "Profile Name",
  "firstEntry": "YYYY-MM-DD",
  "trips": [
    { "departure": "YYYY-MM-DD", "return": "YYYY-MM-DD" },
    { "departure": "YYYY-MM-DD", "return": null }
  ]
}
```

## ILR Absence Rules Implemented

Sources:
- [Appendix Continuous Residence](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-continuous-residence) — CR 3.1: no more than 180 days outside the UK in any 12-month period
- [Home Office continuous residence guidance](https://www.gov.uk/government/publications/continuous-residence/continuous-residence-guidance-accessible-version) — rolling window and whole-day counting
- [Global Talent ILR eligibility](https://www.gov.uk/indefinite-leave-to-remain-business-investor-global-talent/eligibility)

Key rules:
- Limit is **more than 180 days** outside the UK in **any rolling 12-month period**
- Only **whole days** outside the UK count — departure and return dates are excluded
- Same-day and next-day trips count as 0 absence days
- The app scans every possible window from first entry to today to find the historical worst case

**Not implemented**: permitted-absence exceptions (CR 3.4), route-specific 3-year vs 5-year eligibility. This is a personal tracking tool, not legal advice.

## Requirements

- Modern browser with JavaScript and localStorage enabled
