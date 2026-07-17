import { getTranslations } from "next-intl/server";
import type { TodayPost } from "@/lib/reports-shared";

// Shared today's-entries list, used by both the crew screen and the EPC view
// (audit finding M5), so the post markup lives in one place.
export async function TodayPosts({ posts }: { posts: TodayPost[] }) {
  const t = await getTranslations("crew");
  if (posts.length === 0) return <p className="b-sub">{t("noPostsYet")}</p>;

  return (
    <>
      {posts.map((post) => (
        <div
          key={post.id}
          className="b-scope-row"
          style={{ alignItems: "flex-start", flexDirection: "column" }}
        >
          <div>
            <div className="b-h" style={{ fontSize: 15 }}>
              {t("postSummary", { headcount: post.headcount ?? 0, photos: post.photoCount })}
            </div>
            {post.quantities.map((q, i) => (
              <div key={i} className="b-sub">
                {q.name}: {q.qty} {q.unit}
              </div>
            ))}
            {post.note && (
              <div className="b-sub" style={{ marginTop: 4 }}>
                {post.note}
              </div>
            )}
          </div>
          {post.photoUrls.length > 0 && (
            <div className="b-thumbs">
              {post.photoUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="b-thumb">
                  <img src={url} alt="" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
