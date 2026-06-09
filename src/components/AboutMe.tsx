"use client";

import { aboutConfig } from "@/data/projects";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/8bit/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/8bit/avatar";
import { Badge } from "@/components/ui/8bit/badge";

export default function AboutMe() {
  const { greeting, bio, avatarUrl, avatarFallback, tags } = aboutConfig;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8">
      <Card font="normal">
        <CardHeader font="normal">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar font="normal" className="size-20">
              {avatarUrl && (
                <AvatarImage font="normal" src={avatarUrl} alt="Avatar" />
              )}
              <AvatarFallback className="font-pixel text-sm">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle font="normal" className="font-pixel text-[#4a7c10] text-base sm:text-lg">
                {greeting}
              </CardTitle>
              <p className="font-body text-base text-muted-foreground mt-2">
                {bio}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent font="normal">
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Badge
                key={tag.label}
                font="normal"
                variant="outline"
                className={`font-body text-sm px-3 py-1 ${tag.color}`}
              >
                {tag.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
