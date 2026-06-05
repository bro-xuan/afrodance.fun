import { articles } from "@/data/projects";
import {
  Card,
  CardTitle,
} from "@/components/ui/8bit/card";

export default function ArticleGrid() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <h2 className="font-pixel text-[#4a7c10] text-lg sm:text-xl text-center mb-2">
        Notes from the other internet
      </h2>
      <p className="font-body text-sm text-muted-foreground text-center mb-8">
        I also write in Chinese on Xiaohongshu (Red Note).
      </p>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <a
            key={article.title}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-hover block h-full"
          >
            <Card font="normal" className="h-full flex flex-col items-center justify-center p-6 text-center">
              <span className="text-3xl mb-3">{article.emoji}</span>
              <CardTitle font="normal" className="font-pixel text-sm sm:text-base text-[#4a7c10]">
                {article.title}
              </CardTitle>
              {article.caption && (
                <p className="font-body text-xs text-muted-foreground mt-3">
                  {article.caption}
                </p>
              )}
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
