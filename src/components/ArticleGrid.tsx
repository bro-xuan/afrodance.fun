import { articles } from "@/data/projects";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/8bit/card";

export default function ArticleGrid() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <h2 className="font-pixel text-[#4a7c10] text-lg sm:text-xl text-center mb-8">
        Articles
      </h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {articles.map((article) => (
          <a
            key={article.title}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-hover block h-full"
          >
            <Card font="normal" className="h-full flex flex-col">
              <CardHeader font="normal">
                <CardTitle font="normal" className="font-pixel text-sm sm:text-base text-[#4a7c10]">
                  <span className="mr-2">{article.emoji}</span>
                  {article.title}
                </CardTitle>
              </CardHeader>
              <CardContent font="normal" className="flex-1">
                <p className="font-body text-sm text-muted-foreground">
                  {article.description}
                </p>
              </CardContent>
              <CardFooter font="normal">
                <span className="font-body text-xs text-muted-foreground">
                  {new Date(article.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </CardFooter>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
