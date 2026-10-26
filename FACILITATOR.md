# Facilitator guide: the case, the answer, marking

For facilitators and judges only. It contains the answer. Students can technically read it in the
repo, so don't point them here. Every number below is what the SQL queries return on the generated
data (the solution repo's `npm test` checks them). If you change `tools/data/*.js`, rerun
`npm run generate-data`: its story checks fail if the case stops working. Then run `npm run sync-data`
and `npm test` in the solution repo.

**Reference solution:** <https://ui5-workshop-solution.vercel.app> has a finished answer page and a
stretch page (not linked from the kit, don't share it with teams). Its code is in the private repo
[ui5-workshop-solution](https://github.com/VoMinhKhoii/ui5-workshop-solution); the queries are in
`webapp/solution/queries.js`, in the same format as a team's `data.js`, and its `npm test` checks the
numbers below.

## Before the event

- Every laptop needs **Node.js 20 or newer**. Teams fork the repo, then run `npm install` and
  `npm start`. The **first** `npm start` downloads the SAPUI5 libraries (about 1 minute, ~100 MB).
  On venue Wi-Fi, ask teams to do this at home, or run it once before the session starts.
- Do a dry run with someone who has never seen UI5: time the first successful paste (target: under
  5 minutes) and how long the case takes to crack.

## Run of show (45 min + pitches)

| Time | What happens | You do |
| --- | --- | --- |
| 0–5 | Teams read **The case** and open **My app** in a 2nd tab | Demo: Playground → *Copy for data.js* → *Copy XML* → F5 (60 seconds) |
| 5–20 | Investigate in the **Query Playground** | Walk around. Ask "which suspect does the data support, and how do you know?" |
| 10 | | Announce: "Hint 1 is open now" |
| 20 | | Announce: "Hint 2 is open now" |
| 20–25 | Decide the story: finding, key number, chart, next move | Push teams that are still exploring to start building |
| 25–40 | Build page 1 (more pages and a custom shell are stretch goals) | Help with XML errors (F12 → Console) |
| 40–45 | Test, refine, freeze code | |
| then | 2-minute pitch per team, dashboard on screen | Mark with the rubric below |

**Reset a team's machine:** `git checkout webapp/workspace` restores the workspace, including `data.js`.

## Marking rubric (100 points)

| Criterion | Points | Full marks | Half marks |
| --- | --- | --- | --- |
| **Insight** | 30 | Names the real cause (Friday evening), rejects "workshops" with a number | Right area, but no number, or the workshop claim isn't addressed |
| **Evidence** | 25 | 1–2 charts that prove the point on their own. Right chart type, labelled units, honest scale | Charts are correct but generic (e.g. seats per week) and don't show the cause |
| **Clarity** | 20 | Passes the 3-second test: the finding is the first thing you read, the action is concrete | Everything is there but the reader has to hunt for it |
| **Fiori craft** | 15 | Semantic colours (Good/Critical/Error) used for meaning, consistent cards, works narrow | Default look, colour used decoratively |
| **Ambition** | 10 | Other clubs, the promotion data, the free lab slot, extra pages, a working drill-down | One extra element |

A team that builds a beautiful dashboard of the *wrong* answer ("drop the workshops") can still score
Evidence, Clarity and Craft, but loses most of Insight. That is the lesson: the data decides, not
the president's opinion.

## The case: The Friday Problem

> Since October, the Coding Club's events look half empty. The president wants to swap workshops for
> socials, and has to tell the sponsor who pays for the workshops (Quillmoor Software) by Friday.

- **Client:** Coding Club president. **Today:** Mon 16 Nov 2026. **Deadline:** sponsor renewal, Fri 20 Nov.
- **Question:** Why are our events half empty: the topics, the timing or the promotion? What should
  we change next semester?
- **Red herring:** "Students are bored with workshops."
- **Hints:** minute 10, compare `registered` with `checked_in`. Minute 20, compare the same topic on
  different days.

### The trap

Since October (week 5), workshops fill only **50%** of seats, against **62%** for socials and **79%**
for talks. A team that stops here recommends dropping workshops, which loses the sponsor.

```sql
SELECT topic, ROUND(AVG(fill_pct)) AS fill_pct
FROM events WHERE club_id = 'C01' AND week >= 5
GROUP BY topic;
```

### The truth

In week 5 the computer lab's Thursday evening went to an exam course, so the lab events moved to
**Friday 18:30**. People still sign up for them (**93%** of seats), but only **42%** turn up, against
**85%** on Wednesdays and **86%** on Thursdays. 5 of the 6 Friday events were workshops, which is
why workshops *look* unpopular. On weekdays workshops fill **80–84%** of seats, as well as talks
and socials.

```sql
-- R1: where do people drop out?   →  Wed 85 · Thu 86 · Fri 42
SELECT weekday, ROUND(AVG(showup_pct)) AS showup_pct
FROM events WHERE club_id = 'C01'
GROUP BY weekday;

-- R2: the same topic on different days   →  Workshop·Thu 84 · Workshop·Wed 80 · Workshop·Fri 38 · Social·Fri 45
SELECT topic || ' · ' || weekday AS slot, ROUND(AVG(fill_pct)) AS fill_pct
FROM events WHERE club_id = 'C01'
GROUP BY topic, weekday
ORDER BY fill_pct;
```

### Good action

Keep the workshops (and with them the sponsor), and move the lab events off Friday next semester.
The lab M105 is **free on Tuesday evenings** (`room_bookings`: booked Mon, Wed and Thu). Don't swap
workshops for socials: the one Friday social was just as empty (45% of seats).

### Stretch evidence (Ambition points)

| Query | Result |
| --- | --- |
| S1: other clubs, Friday vs. Mon–Thu show-up | **43%** vs. **84%**: every club has a Friday problem |
| S2: reach per event before/after Instagram stopped (week 7, the only JOIN) | **816 → 286** people, but sign-ups **95% → 94%** of seats |
| S3: rating by topic | Workshop **4.49**, Talk **4.10**, Social **3.97** |
| S3: `room_bookings WHERE room = 'M105'` | Mon, Wed, Thu booked: Tuesday is free |

### Why there is only one answer

The generator checks that every other explanation fails in the data (`tools/data/checks.js`):

| Other explanation | Why the data rules it out |
| --- | --- |
| The organiser (Jonas runs every Friday event) | His Wednesday/Thursday events: 86% show-up |
| The room (Friday events are all in lab M105) | The same lab on Thursdays, weeks 1–4: 86% show-up |
| Less promotion | Fridays *with* Instagram (weeks 5–6): 40%. Wednesdays *without* it (weeks 7–10): 86% |
| End-of-semester fatigue | Weekday events in weeks 7–10: 86% |
| The late start time, not the day | Other clubs' weekday events at 18:30 or later: 85%. Their Friday events before 18:30: 44% |
| Workshops on Fridays in particular | The Friday social: 45%, Friday workshops: 42% |

The club also runs at least one workshop every week, so a per-week chart has no gap that looks like
part of the story.

## If a team is stuck

- **Red "data.js" dialog:** it names the failing query and suggests the right column name. The most
  common fixes: a missing `AS` name, text without single quotes (`weekday = 'Fri'`), a missing comma
  between two queries in `data.js`.
- **"My chart is empty":** the path in `data="{/name}"` must match the name in `data.js`, and the
  column names must match the `AS` names. Did they press F5 in the app tab after saving?
- **Lost in the data:** send them back to the three suspects. "Pick one, and test it with one query."
