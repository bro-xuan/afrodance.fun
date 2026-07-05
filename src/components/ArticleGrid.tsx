import { articles, siteConfig } from "@/data/projects";
import { Card, CardTitle } from "@/components/ui/8bit/card";

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
    <section id="writing" className="mx-auto w-full max-w-3xl scroll-mt-8 px-4 py-8">
      <div className="pixel-reveal text-center mb-10">
        <h2 className="font-pixel text-[#4a7c10] text-xl sm:text-2xl [text-shadow:0.12em_0.12em_0_#d5e7b4] mb-3">
          Writing
        </h2>
        <p className="font-body text-sm text-muted-foreground max-w-xl mx-auto">
          Essays on AI, crypto, and the future of work. I&apos;ve written a fair bit
          on RedNote and Twitter over the years — now I&apos;m consolidating
          everything onto{" "}
          <a
            href={substackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#d44332] underline underline-offset-2 hover:opacity-80"
          >
            Substack
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {articles.map((article) => {
          const badge = article.lang ? langBadge[article.lang] : null;
          return (
            <a
              key={article.title}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-reveal card-hover pixel-shadow block h-full"
            >
              <Card font="normal" className="h-full flex flex-col p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{article.emoji}</span>
                  {badge && (
                    <span
                      className={`font-pixel text-[0.6rem] leading-none px-2 py-1.5 ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>

                <CardTitle
                  font="normal"
                  className="font-pixel text-sm sm:text-base text-[#4a7c10] leading-relaxed"
                >
                  {article.title}
                </CardTitle>

                {article.description && (
                  <p className="font-body text-xs italic text-muted-foreground mt-1.5">
                    {article.description}
                  </p>
                )}

                {article.caption && (
                  <p className="font-body text-sm text-muted-foreground mt-3 flex-1">
                    {article.caption}
                  </p>
                )}

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-dashed border-muted-foreground/30">
                  <span className="font-body text-xs text-muted-foreground">
                    {formatDate(article.date)}
                  </span>
                  <span className="font-pixel text-[0.65rem] text-[#d44332]">
                    Read on Substack →
                  </span>
                </div>
              </Card>
            </a>
          );
        })}
      </div>
    </section>
  );
}
