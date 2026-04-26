# ILR Absence Calculator

This web application helps track and calculate absence days for ILR (Global Talent) visa requirements in the UK. It tracks the current rolling 12-month window and also checks the historical maximum absence count in any rolling 12-month window.

## Features

- **Multiple user profiles**: Create and manage different profiles for multiple people
- **Visual timeline**: See a 5-year visual representation of your presence/absence in the UK
- **Rolling 12-month window**: Automatically calculates the rolling 12-month period from the selected current date
- **Historical breach check**: Finds the worst historical 12-month window and shows whether it exceeded 180 days
- **Absence summary**: Shows total days absent in the last 12 months and remaining allowance
- **Trip management**: Add, edit, and delete trips with departure and return dates
- **Profile import/export**: Profiles are stored in browser localStorage and can be imported/exported as JSON

## File Structure

```
ilr-absence-calculator/
├── index.html           # Main HTML file with UI
├── js/                  # JavaScript directory
│   └── app.js           # Application logic
├── .profiles/           # Default load/export directory for JSON profiles (gitignored)
└── README.md            # Documentation and usage instructions
```

## Setup

1. Open `index.html` in a modern web browser.
2. Create profiles as needed.
3. Use **Export Profiles** to download a JSON backup.
4. Use **Import Profiles** to restore or merge profiles from a JSON export.

## How to Use

1. **Managing Profiles**:
   - Create a new profile by entering a name and clicking "Create Profile"
   - Use "Export Profiles" to download profile data as JSON
   - Use "Import Profiles" to load profile data from JSON
   - Select an existing profile from the dropdown

2. **Setting Up Profile**:
   - Enter your first entry date in the UK
   - Save the profile

3. **Adding Trips**:
   - Enter departure date (when you left the UK)
   - Enter return date (when you came back), or leave empty for ongoing trips
   - Click "Add Trip"

4. **Viewing Data**:
   - The absence summary shows your status at a glance
   - The timeline visualization shows your entire 5-year period with color coding:
     - Green: Present in the UK
     - Red: Absent from the UK
     - Gray: Future dates
     - Blue outline: Current rolling 12-month window

## Profile JSON Format

Each profile is stored as a separate JSON file with the following structure:

```json
{
  "firstEntry": "YYYY-MM-DD",  // Date of first entry to the UK
  "trips": [
    {
      "departure": "YYYY-MM-DD",  // Date left the UK
      "return": "YYYY-MM-DD"      // Date returned to the UK (or null if not returned)
    },
    // Additional trips...
  ]
}
```

## ILR Absence Rule Research

Primary sources:

- [Appendix Continuous Residence](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-continuous-residence): CR 3.1 says the applicant must not have been outside the UK for more than 180 days in any 12-month period, unless an exception applies.
- [Home Office continuous residence guidance](https://www.gov.uk/government/publications/continuous-residence/continuous-residence-guidance-accessible-version): explains rolling 12-month calculations and whole-day counting.
- [Global Talent ILR eligibility](https://www.gov.uk/indefinite-leave-to-remain-business-investor-global-talent/eligibility): route-specific ILR eligibility overview.

Key rules implemented here:

- The limit is **more than 180 days** outside the UK in **any rolling 12-month period**.
- Only **whole days outside the UK** are counted.
- The app therefore does **not** count the departure date or the return date for a completed trip.
- Same-day and next-day trips normally count as `0` absence days because there is no full calendar day outside the UK between departure and return.
- The current 12-month summary is separate from the historical breach check.

Important limitations:

- The app does not classify or exclude permitted absences under Appendix Continuous Residence CR 3.4.
- The app does not decide whether a person qualifies under a 3-year or 5-year Global Talent route.
- This is a personal tracking tool, not legal advice.

## Calculation Logic

- The application follows the ILR absence calculation rules:
  - Counts only full days outside the UK
  - Excludes departure and return dates for completed trips
  - Calculates absences in the current rolling 12-month period
  - Finds the worst historical rolling 12-month period from first entry to the selected current date
  - Tracks against the 180-day limit in any consecutive 12-month period
  - Handles absence periods that cross over different 12-month periods

## Requirements

- Modern web browser with JavaScript enabled
- Browser localStorage enabled
