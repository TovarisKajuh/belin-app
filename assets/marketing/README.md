# Marketing assets

Everything here is GENERATED. Do not edit these files by hand: change the
product or the pipeline and re-run, or your edit is lost on the next run.

    npm run marketing:shoot     app screens (raw + framed)

- `raw/` flat screenshots at 2x (desktop) or 3x (phone), transparent-free PNGs
  straight from the browser. These are the masters, and the input to the
  founder's device-mockup tool when an angled shot is wanted.
- `framed/` the same shots inside a thin browser or phone frame with a soft
  shadow, composed on transparency, ready to drop onto any background.

The pipeline signs in by minting real login tokens and walking the real magic
link, sets a `belin-shot` cookie so the dev pills and the swap bar hide
themselves, waits for the launch animation to unmount, and shoots. It needs the
dev server running and refuses with a clear message otherwise.

## Presentations

    npm run marketing:salzburg   the Salzburg EPC deck

Built decks are written to `public/p/`, not here, because they are served: a
push to main publishes them on the Vercel project. One artifact, one build, no
second copy in this folder to drift out of sync. Source lives in `source/`.

`site/` holds real AVESOL site photography. Unlike everything else here these
are MASTERS, not generated: they exist nowhere else in this repo.
