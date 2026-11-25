# SmartSched

A private, offline-first class planner built with React, TypeScript, Vite, and Dexie. Your recurring timetable stays in this browser’s IndexedDB—no account or backend required.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

```sh
npm run build    # TypeScript checks and production PWA build
npm run preview  # Preview the production build
npm test         # Timetable, repair, layout, and class-reminder regressions
```

## Plan your week

- **Overview:** today’s agenda, live and completed classes, the next upcoming session, weekly totals, and overlap reminders.
- **Free-time finder:** choose a weekday and a minimum break of 30, 60, 90, or 120 minutes. Available windows are calculated between 8 AM and 6 PM, merging overlapping classes first. These are recurring weekly gaps, not bookings or reminders.
- **Weekly timetable:** two views. **Original table layout** reproduces the imported weekday columns and time rows (subject, room, instructor), including empty lunch periods. **Calendar cards** shows duration-accurate blocks, optional weekend columns, day filters, and side-by-side overlaps. Select any cell or card to edit the full session.
- **My classes:** search subjects, rooms, and instructors; filter by day; edit or delete. Deleted classes can be restored with **Undo** for 10 seconds.
- **Themes:** Light, Dark, and System options in the header. Preferences persist; System follows your operating system, and changes sync across open tabs.
- **Class reminders:** choose the bell in the header to get a browser notification before each class. Pick at class start, 5, 10, 15, 30, or 60 minutes before. For example, a 10:00 PM class with a 10-minute lead reminds you at 9:50 PM. Use **Send test** to check that notifications work.
- **Calendar export:** download recurring weekly events as an `.ics` file for calendar apps. Times use the device’s local timezone, with no term end date.

Use **Add class** to create a weekly session. Subject, day, and valid start/end times are required; room and instructor are optional. Time conflicts are shown before saving, and can be explicitly accepted.

### How class reminders behave

Reminders are local to your browser and require notification permission, which is requested only when you turn them on. They run while SmartSched is open in a tab or installed window, including a background tab. A fully closed web app cannot be woken to show a local reminder without a push server, so keep SmartSched open (or installed and running) if you want reminders for later classes. Clicking a reminder returns to the planner. Reminders are deduplicated per class occurrence, so editing or reloading the page does not produce repeat alerts.

## Import a school schedule

1. Choose **Import** from the header or **Import schedule** from the sidebar or My classes.
2. Select an Excel (`.xlsx`), CSV/TSV, photo, or text-based PDF.
3. Compare the generated **source-style preview** with your original. It uses the same weekday columns and time rows as the uploaded timetable.
4. Open **Edit extracted details** only if a subject, room, time, or instructor needs correction.
5. Keep **Replace existing schedule** selected when fixing an earlier import. Confirm to save.

Replace is the default because appending an older version of the same timetable creates invisible duplicates and split class blocks. Replace removes the old records only after you confirm; a repair also keeps a restore point. Use **Add alongside existing classes** only for a genuinely different term or schedule.

Exact duplicates (same subject, day, times, room, and instructor) are skipped. Imports are saved transactionally.

### Import-friendly CSV

```csv
day,start,end,subject,room,instructor
Monday,07:30,10:30,ITM 123,Comp Lab 2,Professor Name
Thursday,10:30,12:00,ITM 113,Comp Lab 2,Professor Name
Saturday,09:00,11:00,Design Workshop,Studio 1,Professor Name
```

Files are processed locally with ExcelJS, PDF.js, or Tesseract.js. The maximum file size is 12 MB, and import review supports up to 500 sessions per batch.

### Automatic timetable organization

Image import detects and removes grid lines, enlarges the text for OCR, reconstructs weekday columns and split time labels, and combines a subject/room/instructor across consecutive time rows into a full session. Code-shaped cells receive a second, focused OCR pass. Afternoon times are inferred from the top-to-bottom time sequence, and repeated subjects share a color.

The importer also stores the detected table layout. The Weekly timetable opens in **Original table layout**, so the saved schedule keeps the source’s time rows (7:30–8:00 … 4:30–5:00), weekday columns, empty lunch rows, and the standard three-row subject/room/instructor pattern. When you add a class outside those rows, the table inserts the required row instead of clipping the class.

For the reference Monday–Friday timetable, this produces eight sessions: Monday’s CAP 102 and ITM 113; Tuesday’s two ITM 123 sessions and CAP 102; Thursday’s two ITE 107 sessions and ITM 113. Monday ITM 113 is correctly placed at **1:00–2:30 PM**, rather than in the early morning.

### Repair an older import

Schedules saved by an older version may contain border artifacts such as “I” or “II”, or the same class split into repeated 30-minute blocks. The **Review repair** banner on Overview or the Weekly timetable proposes a reversible cleanup:

- removes short border-text artifacts with no room or instructor;
- merges touching 30-minute fragments of the same subject only when their room and instructor match;
- removes fragments already covered by a complete session;
- keeps longer back-to-back repeats, different rooms, different instructors, and gaps untouched.

The repair shows every proposed change before saving and keeps an undo point. It does **not** invent course names, rooms, or instructors. To recover details that were never saved, upload the original timetable again and use **Replace existing schedule**.

Photo recognition is best-effort: always review its results. Scanned PDFs are not automatically converted to images; use a photo instead. The OCR engine and language assets require an initial online download, and offline OCR depends on browser caching.

## Install and use offline

The production build includes a service worker and installable PWA metadata. After the initial successful load, the app shell and saved classes are available offline. Use **Install app** in the header: supported browsers show their native installation prompt; other browsers get platform-specific instructions. Deployments require HTTPS outside localhost. OCR assets are runtime-cached after successful downloads where the browser permits caching; first-time OCR still needs internet.

### Mobile and desktop schedule widget

Choose **Widget** in the header:

- **Floating desktop widget:** browsers with Document Picture-in-Picture can display an always-on-top window while the planner remains open.
- **Compact window:** opens a small separate browser window, including on desktop browsers without floating-window support.
- **Mobile / installable view:** `/?widget=1` has its own manifest and home-screen entry point. Open this view and choose **Install app**, or add it to the home screen using your browser.

The widget has Today and Up next views, room/instructor details, current-class highlighting, completed-class states, theme synchronization, and reactive local data updates. Its clock refreshes every 15 seconds while open and immediately when the page regains focus. Browser background throttling still applies. Separately installed apps may have isolated storage on some platforms; synchronization only works where the browser shares the same origin storage.

A PWA cannot provide a native iOS/Android home-screen widget, macOS WidgetKit widget, or Windows widget-board integration. Those require native platform packaging; this implementation provides a compact installable web view and supported floating browser windows.

Data is local to this browser and device. Export your calendar before clearing browser storage. Calendar export is for use in calendar applications; this app does not currently restore `.ics` files. Notifications while the app is closed are not supported.

## Source map

- `src/App.tsx` — workspace, class editor, timetable, calendar export
- `src/planning.ts` — free-time interval calculation and overlap layout
- `src/theme.ts` — theme persistence and system preference handling
- `src/Modal.tsx` — keyboard focus, Escape dismissal, and focus restoration
- `src/notifications.ts`, `src/useClassReminders.ts`, `src/ClassReminders.tsx` — reminder timing, permission handling, and notification panel
- `public/notification-sw.js` — focuses the planner when a reminder is clicked
- `src/InstallApp.tsx`, `src/WidgetLauncher.tsx`, `src/WidgetView.tsx` — PWA installation and compact/floating schedule views
- `src/import/prepareImage.ts` — table-line detection and OCR image preprocessing
- `src/ImportPage.tsx`, `src/import/` — extraction, source-style preview, validation, and import
- `src/SourceTimetable.tsx` — original table layout and preserved row/column geometry
- `src/scheduleRepair.ts`, `src/RepairSchedule.tsx` — reversible cleanup of older imports
- `src/database.ts` — IndexedDB schema, saved layout, and shared class types
- `src/style.css` — theme tokens, responsive layouts, and component styles
- `tests/import.test.ts`, `tests/repair.test.ts`, `tests/notifications.test.ts` — reference timetable, OCR coordinates, AM/PM, merged-cell, layout, repair, and reminder regressions
