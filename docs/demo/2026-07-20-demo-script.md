# Demo runbook, 20.07.2026 (Slovenian prospect)

Reset before the meeting: `npm run seed`. This puts the demo in a clean state,
Dan 1 empty and Trenutno half-built.

Two devices or two browser tabs. Log in on each:
- EPC (laptop): 12345 / 12345
- Crew (phone): 54321 / 54321

Both land on Trenutno (the half-built project). The bottom-left pill switches
between Trenutno and Dan 1. The demo runs on Dan 1, then shows Trenutno.

## The story, beat by beat

1. Open the phone. The dark launch mark, then the landing page. Log in as the
   crew. This is the whole sign-in: no passwords app, no install.

2. Switch the phone to Dan 1. The crew cannot start a daily report yet: the
   screen asks them to check the material first ("Najprej preverite material").
   This is the point: nothing gets logged until we know what arrived on site.

3. The delivery arrived. Tap "Vse prispelo", then mark one line "Delno" and type
   how much is missing (a real shortfall, caught on day one when it is cheap to
   fix). Attach a photo of the pallet and a photo of the dobavnica. Send. Under
   half a minute of tapping.

4. The daily report unlocks. The crew logs the day's work as normal.

5. On the laptop, switch to Dan 1. The EPC sees the material panel: the missing
   line, the two documents, the exact time it was checked. No phone call, no
   email. If the crew submits another report right now, the dashboard updates on
   its own within a couple of seconds (the "V živo" badge shows it is live).

6. The EPC realises a part was left off the list. Add it in the panel (name,
   quantity, unit). NARRATION: "In the finished product this list comes straight
   from your Stückliste PDF, you never type it. This is just to show the loop."
   The crew's phone is immediately prompted to check the new part. They check it,
   and the EPC panel settles.

7. Switch both back to Trenutno: a project two weeks in. The same screens, full
   of real reports, photos and progress. This is what the EPC lives in every day.

## If live sync stumbles on the venue wifi

The dashboard refresh depends on a websocket. If it does not update on its own
within a few seconds, pull to refresh (or reload the page): the data is already
saved, only the automatic nudge was missed. Do not wait and stare at a frozen
screen; reload and carry on.

## After the meeting

`npm run seed` again to reset for the next showing.
