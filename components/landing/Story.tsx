import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { Shot } from "./Shot";

// The landing page below the fold: the job told in five moments, in the order
// they happen on a real project.
//
// The structure is the argument. Somebody reading this already does all five
// things, by hand, in WhatsApp and Excel; each section names one of them and
// shows what it looks like when the product does it instead. Nothing here is a
// feature list, because a feature list asks the reader to imagine the workflow
// and this page is trying to show it to them.
//
// Rhythm: a numbered eyebrow, one sentence that could stand alone as the claim,
// the detail underneath, and a screenshot slot to the side. Sections alternate
// side so the eye moves down the page rather than scanning a column. Gold is
// spent only on the numbers and the one aside per section, so it still means
// "look here" by the fifth screen.

export async function Story({ locale }: { locale: string }) {
  const t = await getTranslations("landing");

  return (
    <>
      {/* 01: the plan goes in */}
      <section className="lp-sec">
        <div className="lp-sec-in">
          <div className="lp-sec-text">
            <p className="lp-num">{t("dropEyebrow")}</p>
            <h2 className="lp-h2">{t("dropTitle")}</h2>
            <p className="lp-body">{t("dropBody")}</p>
            <p className="lp-aside">{t("dropAside")}</p>
          </div>
          <div className="lp-sec-media">
            <Shot src="/landing/wizard-review.webp" caption={t("dropShot")} ratio="1500 / 1354" priority />
          </div>
        </div>
      </section>

      {/* 02: the daily loop, the only section with two devices side by side,
          because the whole point is that both sides see one job.
          It runs FULL WIDTH rather than in the two-column rhythm of the others:
          in a side column the dashboard came out 371px wide, which is a smudge,
          and an unreadable screenshot proves nothing. This is the one place the
          product itself has to be legible, so the text goes above it and the
          shots get the whole page. */}
      <section className="lp-sec lp-sec--wide">
        <div className="lp-sec-in lp-sec-in--column">
          <div className="lp-sec-text lp-sec-text--center">
            <p className="lp-num">{t("loopEyebrow")}</p>
            <h2 className="lp-h2">{t("loopTitle")}</h2>
            <p className="lp-body">{t("loopBody")}</p>
          </div>
          <div className="lp-sec-media lp-pair">
            <Shot src="/landing/crew-phone.webp" caption={t("loopShotCrew")} ratio="738 / 1600" />
            <Shot src="/landing/epc-dashboard.webp" caption={t("loopShotEpc")} ratio="1800 / 881" />
          </div>
          <p className="lp-aside lp-aside--center">{t("loopAside")}</p>
        </div>
      </section>

      {/* 03: the three moments that actually cost money */}
      <section className="lp-sec lp-sec--wide">
        <div className="lp-sec-in lp-sec-in--column">
          <div className="lp-sec-text lp-sec-text--center">
            <p className="lp-num">{t("truthEyebrow")}</p>
            <h2 className="lp-h2">{t("truthTitle")}</h2>
          </div>

          <div className="lp-three">
            {[
              { title: t("truth1Title"), body: t("truth1Body") },
              { title: t("truth2Title"), body: t("truth2Body") },
              { title: t("truth3Title"), body: t("truth3Body") },
            ].map((card) => (
              <article key={card.title} className="lp-card3">
                <h3 className="lp-card3-t">{card.title}</h3>
                <p className="lp-card3-b">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 04: what comes out the other end.
          FULL WIDTH, for the same reason section 02 is: three A4 sheets in a
          half column render about 250px wide each, and a document nobody can
          read is a picture of a rectangle. Across the whole page they land near
          450px, where the headings, the signatures and the totals are legible
          and the claim in the heading is visibly true. */}
      <section className="lp-sec lp-sec--wide">
        <div className="lp-sec-in lp-sec-in--column">
          <div className="lp-sec-text lp-sec-text--center">
            <p className="lp-num">{t("paperEyebrow")}</p>
            <h2 className="lp-h2">{t("paperTitle")}</h2>
            <p className="lp-body">{t("paperBody")}</p>
          </div>
          {/* The three documents themselves, rasterized from the real PDF bytes
              in storage, cropped to the part that carries the proof and fanned
              like sheets on a desk. The acceptance protocol takes the middle
              because it is the only one of the three that carries signatures.
              Captions became alt text: with the actual pages on screen, a label
              under each one is describing what the reader is already looking at. */}
          <div className="lp-sec-media lp-papers">
            <Image src="/landing/doc-report.webp" alt={t("paperDoc1")} width={920} height={852} sizes="(max-width: 900px) 78vw, 400px" />
            <Image src="/landing/doc-abnahme.webp" alt={t("paperDoc2")} width={920} height={818} sizes="(max-width: 900px) 78vw, 450px" />
            <Image src="/landing/doc-invoice.webp" alt={t("paperDoc3")} width={920} height={852} sizes="(max-width: 900px) 78vw, 400px" />
          </div>
          <p className="lp-aside lp-aside--center">{t("paperAside")}</p>
        </div>
      </section>

      {/* 05: the compliance strip. Deliberately plain text on a rule: it is a
          reassurance, not a sales moment, and dressing it up would make it look
          like one. */}
      <section className="lp-strip">
        <div className="lp-strip-in">
          <h2 className="lp-strip-t">{t("complianceTitle")}</h2>
          <ul className="lp-strip-l">
            <li>{t("compliance1")}</li>
            <li>{t("compliance2")}</li>
            <li>{t("compliance3")}</li>
          </ul>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-cta-in">
          <h2 className="lp-h2">{t("ctaTitle")}</h2>
          <p className="lp-body">{t("ctaBody")}</p>
          <div className="lp-cta-row">
            <Link href={`/${locale}/login`} className="lp-cta-btn">
              {t("ctaButton")}
            </Link>
            <a href="mailto:info@getbelin.com" className="lp-cta-mail">
              {t("ctaMail")}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
