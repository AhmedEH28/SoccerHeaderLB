<<<<<<< HEAD
# Football Event Labeling App

This folder is a standalone labeling interface for students. It does not depend on the header-action-spotting codebase.

Students can open a football video, pause at an action, click a label button, and export the annotations as a CSV that opens in Excel.

## What It Saves

Each annotation row contains:

```text
video_name
timestamp
seconds
action
binary_label
visibility
team
annotator
notes
created_at
```

Binary labels:

```text
HEADER -> 1
all other actions -> 0
```

## Run Locally

From this folder:

```bash
python3 -m http.server 5177
```

Then open:

```text
http://localhost:5177
```

If `python3` is not available, try:

```bash
python -m http.server 5177
```

## Student Workflow

1. Open the website.
2. Enter annotator name or student ID.
3. Click `Open local video`.
4. Select the football video from the computer or USB drive. The app fills the video name automatically.
5. Watch the video.
6. Pause at the action moment.
7. Click `Mark HEADER at Current Time` for a header.
8. Click `Mark NON-HEADER at Current Time` for non-header/background actions.
9. Add visibility, team, and notes if needed.
10. Click `Export CSV` when finished.

The exported CSV can be opened in Excel.

## Recommended Labels

Use `HEADER` for real header contact.

Use non-header labels for useful hard negatives:

```text
PASS
CROSS
SHOT
CLEARANCE
DRIVE
TACKLE
SAVE
OTHER
```

Team choices are only:

```text
home
away
```

The FPS value is used only for the `-1 frame` and `+1 frame` buttons. The browser does not always expose true FPS metadata, so the app tries to estimate FPS after the video starts playing and otherwise keeps the fallback value.

## Timestamp Meaning

Timestamp format:

```text
HH:MM:SS.mmm
```

Example:

```text
00:13:20.100
```

This means 13 minutes, 20 seconds, and 100 milliseconds.

## Important Notes

- The app stores annotations in the browser's local storage until exported.
- Always export CSV before closing or switching computers.
- A deployed Vercel site cannot automatically read files from a USB drive. Students must select the local video using `Open local video`.
- Long videos can still be opened locally by the browser, but for easier work you may split full matches into 10 or 15 minute chunks.
- For quality control, assign the same video/chunk to two students and compare timestamps.

## Deploy To Vercel

This is a static app. You can deploy the folder to Vercel as a static site.

Recommended Vercel settings:

```text
Framework Preset: Other
Build Command: leave empty
Output Directory: .
```

If this folder is inside a larger GitHub repository, set the Vercel root directory to:

```text
Data labling
```

## Output Example

```csv
video_name,timestamp,seconds,action,binary_label,visibility,team,annotator,notes,created_at
match_001.mp4,00:13:20.100,800.1,HEADER,1,visible,home,student_a,clear contact,2026-06-18T00:00:00.000Z
match_001.mp4,00:18:42.500,1122.5,CROSS,0,visible,away,student_a,no header,2026-06-18T00:05:00.000Z
```
=======
# SoccerHeaderLB
A soccer header labeling interface
>>>>>>> 51f48a2add6e153d74b6c8c709b1cc47021b74b7
