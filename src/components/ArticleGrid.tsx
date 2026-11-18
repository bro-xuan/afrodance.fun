import { articles, siteConfig } from "@/data/projects";

const langBadge: Record<string, { label: string; cls: string }> = {
  en: { label: "EN", cls: "bg-[#d6eaf8] text-[#15608f]" },
  zh: { label: "中文", cls: "bg-[#fadbd8] text-[#a93226]" },
};

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ArticleGrid() {
  const substackUrl = siteConfig.socials.substack ?? "https://substack.com/@stefanwangeth";

  return (
    <section id="writing" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-12 sm:py-16">
      <div className="pixel-reveal mb-10 flex flex-col items-center text-center">
        <span className="font-pixel mb-3 inline-block border-2 border-[#2d2d2d] bg-[#fbe9e5] px-2.5 py-1 text-[0.58rem] tracking-wider text-[#a93226]">
          02 / ESSAYS
        </span>
        <h2 className="font-pixel !mb-3 text-xl text-[#4a7c10] [text-shadow:0.12em_0.12em_0_#d5e7b4] sm:text-2xl">
          Writing
        </h2>
        <p className="font-body !mb-0 max-w-xl text-base text-[#595959]">
          Essays on AI, crypto, and the future of work. After years of posting across RedNote and
          X, I&apos;m consolidating everything onto{" "}
          <a
            href={substackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="!text-[#d44332] underline underline-offset-2 hover:opacity-80"
          >
            Substack
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {articles.map((article) => {
          const badge = article.lang ? langBadge[article.lang] : null;
          return (
            <a
              key={article.title}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group pixel-reveal card-hover pixel-shadow !flex h-full flex-col border-4 border-[#2d2d2d] !bg-white !no-underline"
            >
              <div className="flex items-center justify-between border-b-4 border-[#2d2d2d] bg-[#f7f3e8] px-4 py-2.5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="text-xl leading-none">
                    {article.emoji}
                  </span>
                  <span className="font-body text-sm text-[#595959]">
                    {formatDate(article.date)}
                  </span>
                </div>
                {badge && (
                  <span
                    className={`font-pixel border-2 border-[#2d2d2d] px-2 py-1 text-[0.55rem] leading-none ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
                <div>
                  <h3 className="font-pixel !mb-0 text-sm leading-relaxed text-[#2d2d2d] transition-colors group-hover:text-[#4a7c10] sm:text-base">
                    {article.title}
                  </h3>

                  {article.description && (
                    <p className="font-body !mt-1.5 !mb-0 text-sm italic text-[#595959]">
                      {article.description}
                    </p>
                  )}

                  {article.caption && (
                    <p className="font-body !mt-3 !mb-0 text-base leading-relaxed text-[#595959]">
                      {article.caption}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t-2 border-dashed border-[#2d2d2d]/15 pt-3.5">
                  <span className="font-body text-sm text-[#595959]">Substack essay</span>
                  <span className="font-body text-base font-semibold text-[#d44332]">
                    Read on Substack →
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
