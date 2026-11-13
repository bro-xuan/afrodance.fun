import { siteConfig } from "@/data/projects";

export default function Contact() {
  return (
    <section id="contact" className="mx-auto w-full max-w-3xl scroll-mt-8 px-4 py-8">
      <div className="pixel-reveal nes-container with-title">
        <p className="title font-pixel">say hi</p>
        <div className="flex flex-col items-center gap-4 p-2 text-center">
          <p className="font-body text-sm sm:text-base text-muted-foreground">
            Want better posts for your business, or to chat about AI and crypto? LinkedIn and X are
            the best places to find me.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={siteConfig.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="nes-btn is-primary"
            >
              LinkedIn
            </a>
            <a
              href={siteConfig.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="nes-btn"
            >
              X / Twitter
            </a>
            <a
              href={siteConfig.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="nes-btn"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
