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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/8bit/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/8bit/accordion";

export default function AboutMe() {
  const { greeting, bio, avatarUrl, avatarFallback, tags, skills, likes } =
    aboutConfig;

  return (
    <section className="px-4 py-8">
      <Card font="normal">
        <CardHeader font="normal">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar font="normal" className="size-20">
              <AvatarImage font="normal" src={avatarUrl} alt="Avatar" />
              <AvatarFallback className="font-pixel text-sm">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle font="normal" className="font-pixel text-[#4a7c10] text-base sm:text-lg">
                {greeting}
              </CardTitle>
              <p className="font-body text-base text-muted-foreground mt-2 max-w-lg">
                {bio}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent font="normal">
          <Tabs font="normal" defaultValue="about" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="about" className="font-pixel text-[10px] sm:text-xs flex-1">
                About
              </TabsTrigger>
              <TabsTrigger value="skills" className="font-pixel text-[10px] sm:text-xs flex-1">
                Skills
              </TabsTrigger>
              <TabsTrigger value="likes" className="font-pixel text-[10px] sm:text-xs flex-1">
                Likes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-4">
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
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <Accordion type="single" collapsible className="w-full">
                {skills.map((category) => (
                  <AccordionItem key={category.title} value={category.title}>
                    <AccordionTrigger font="normal" className="font-pixel text-xs text-[#4a7c10]">
                      {category.title}
                    </AccordionTrigger>
                    <AccordionContent font="normal">
                      <div className="flex flex-wrap gap-2">
                        {category.items.map((item) => (
                          <span
                            key={item}
                            className="font-body text-sm text-muted-foreground"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="likes" className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {likes.map((like) => (
                  <div
                    key={like.label}
                    className="flex items-center gap-2 font-body text-sm text-muted-foreground"
                  >
                    <span className="text-lg">{like.emoji}</span>
                    {like.label}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
