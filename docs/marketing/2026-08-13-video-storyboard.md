# The demo video

Slovenian, captions only, no voiceover. Built by the machine from the real app,
like every other asset here, so it can be recut whenever the product changes.

## Why captions and not a voice

It plays muted. LinkedIn, WhatsApp and a phone in a van all start muted, and
most people never turn sound on. A voiceover also needs either the founder's
voice, which costs a recording session every time a word changes, or a synthetic
one, which costs money and sounds like a synthetic one. Captions cost nothing,
change with a string, and translate into German by editing three lines.

## The cut

Cold open. No title card at the front: the first three seconds are the product
doing the thing, because a title card at second zero is where a viewer leaves.

As built, 40.5 seconds:

| t | scene | what is on screen | caption |
|---|---|---|---|
| 0.0 to 12.0 | crew | the roof screen: quantities tapped up, a photo added, sent | Toliko traja dnevno poročilo. / 30 sekund, z eno roko, na strehi. |
| 12.0 to 21.5 | dashboard | the EPC dashboard, the report in the day feed | Naročnik vidi v živo. Brez klica. |
| 21.5 to 28.5 | money | an open hour sheet with the six day countdown running | Ure in dodatna dela, dogovorjena sproti. |
| 28.5 to 35.5 | paper | a slow push over the three fanned documents | Papirologija? Narejena. |
| 35.5 to 40.5 | end | the mark, the claim, getbelin.com | |

The acceptance signatures were storyboarded for the money scene and are not in
the v1 cut: filming them means driving the whole finalization chain first, which
leaves the demo in a state the seed then has to undo. The hour sheet carries
that beat on its own, and the signatures are already the centre of the paper
scene.

The portrait scene is composed differently from the two landscape ones: the
phone sits right of centre and its caption is a headline in the empty left
third. A caption plate under the phone covered the submit button and the tab
bar, which are the two things that scene exists to show.

Order is the order the money moves: work happens, the client sees it, the extras
get agreed, the paperwork comes out signed. Same spine as the landing page, so
somebody who watches the video and then opens the site is not told a new story.

## How it is made here

Everything is scripted. No screen recording by hand, no editor.

1. `scripts/marketing/video-takes.mjs` drives the seeded demo in Playwright with
   `recordVideo`, one context per scene, and writes a webm per take. The same
   sign-in machinery as the screenshot pipeline: real minted tokens, the real
   magic link, the `belin-shot` cookie so no dev chrome appears.
2. `scripts/marketing/video-cut.mjs` trims each take to its window, scales it,
   concatenates, then burns in captions as PNG overlays rendered by sharp, so
   the type is the app's Inter rather than whatever font ffmpeg's drawtext can
   find. Output: 1080p mp4, H.264, plus a 1080x1920 crop of the crew scene for
   stories and WhatsApp status.
3. The result is watched, not assumed: frames are extracted at every scene
   boundary and looked at, and `ffprobe` checks the duration.

Regenerate with `npm run marketing:video`.

## Ad 2: the document speaks (founder's idea, 2026-08-13)

Not a demo. A single artifact, held long enough to be read, then one line.

| t | what | audio |
|---|---|---|
| 0 to 5 | the completion report, alone, filling the frame, slowly pushing in. Nothing else. No logo, no caption, no music. | silence |
| 5 to 12 | the sheet holds, then the mark and getbelin.com fade in | "To poročilo je podizvajalec ustvaril za svojega naročnika, z Belinom." |
| 12 to 14 | end card | "Belin. getbelin.com" |

Why it is a good idea: it inverts the demo. A feature tour asks the viewer to
imagine the outcome; this shows the outcome first and explains it after. Five
seconds of silence in a feed full of noise is a pattern interrupt, and the
report is the most credible object this company owns, because a prospect
recognises the document he already chases people for.

**It must still work muted**, which is the one thing that has to be got right.
Most of the feed will never hear the voice, so the line has to be burned in as
type at the same moment it is spoken, not offered as an accessibility subtitle.
The silence then reads as deliberate rather than broken.

Open questions, to settle before it is built:

1. **Whose voice.** The founder's own, in Slovenian, is more credible than any
   synthetic one for fifteen words and costs one phone recording. German is the
   real question: a synthetic German voice on an ad aimed at German EPCs will be
   heard as synthetic, so that version wants a native speaker or no voice at
   all.
2. **Which document.** The completion report reads as the fullest, but the
   acceptance protocol carries two signatures, which is the harder thing to
   fake. Worth cutting both and choosing by eye.
3. **The closing line in Slovenian.** "Get Belin" is a good English tag and does
   not translate: "Vzemi Belin" is wrong. Either keep the English as a brand
   line or end on "Belin. getbelin.com" and let the mark do the work.
4. **Length.** 14 seconds as scripted. Feed formats reward under 15, so this fits
   without compression.

Buildable on the existing pipeline: the document is already a transparent PNG
from the paper renderer, the push-in is the same zoompan the paper scene uses,
and the only new machinery is one audio track laid over the timeline.

## How this is usually done, and why not that way

For the record, since the question came up.

**Screen recording plus an editor** (Loom, ScreenStudio, CleanShot, then
Premiere or Final Cut, or Descript for edit-by-transcript). This is what most
small SaaS teams actually do, and Screen Studio in particular is what gives
those glossy demos their automatic zooms and smooth cursor. It looks great and
costs a person an afternoon per cut. The killer is that every recut is another
afternoon, and this product's screens change weekly.

**Programmatic video from code** (Remotion, which renders React to mp4). The
serious alternative, and genuinely good: real component reuse, a timeline in
code, versioned in git. Rejected for v1 because it is a second rendering
pipeline to learn and maintain for what is, in the end, six screen recordings
and six lines of text. Worth revisiting when the video needs animated data,
counters, or motion the app itself cannot perform.

**Generative AI video** (Sora, Runway, Veo, Kling). Wrong tool for this job, not
because it is bad but because it invents. This video's entire value is that
every pixel is the real product doing a real thing on real seeded data; a
plausible hallucinated dashboard would be worth less than no video. Where the AI
tools do belong here: a synthetic voiceover later (ElevenLabs) if the video ever
speaks, and background music from a licensed library, neither of which v1 needs.

**Templated marketing video** (Canva, VEED, Kapwing, Pictory). Fast, and they
look it. Fine for a social ad, wrong for the one asset that has to convince a
German EPC that this is a serious tool.

The chosen path costs nothing per recut, which is the property that matters when
the product is still moving every week.
