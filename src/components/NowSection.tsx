import { nowItems } from "@/data/projects";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/8bit/card";

export default function NowSection() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8">
      <h2 className="font-pixel text-[#4a7c10] text-lg sm:text-xl text-center mb-8">
        What I&apos;m Up To Now
      </h2>
      <Card font="normal">
        <CardHeader font="normal">
          <CardTitle font="normal" className="font-pixel text-sm text-[#4a7c10]">
            /now
          </CardTitle>
          <CardDescription font="normal" className="font-body text-[#1a7abb]">
            What I&apos;m currently focused on
          </CardDescription>
        </CardHeader>
        <CardContent font="normal">
          <ul className="space-y-3">
            {nowItems.map((item) => (
              <li
                key={item.text}
                className="flex items-start gap-3 font-body text-sm text-muted-foreground"
              >
                <span className="text-lg shrink-0">{item.emoji}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-body text-xs text-muted-foreground">
            Inspired by{" "}
            <a
              href="https://nownownow.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a7abb] underline"
            >
              nownownow.com
            </a>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
