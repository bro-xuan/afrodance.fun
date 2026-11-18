import { siteConfig } from "@/data/projects";

export default function Contact() {
  const substackUrl = siteConfig.socials.substack ?? "https://substack.com/@stefanwangeth";

  return (
    <section id="contact" className="mx-auto w-full max-w-4xl scroll-mt-8 px-4 py-10 sm:py-12">
      <div className="pixel-reveal pixel-shadow border-4 border-[#2d2d2d] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#2d2d2d] bg-[#d6eaf8] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 border border-[#2d2d2d] bg-[#e07460]" />
              <span className="inline-block h-2.5 w-2.5 border border-[#2d2d2d] bg-[#e6b800]" />
              <span className="inline-block h-2.5 w-2.5 border border-[#2d2d2d] bg-[#6aad30]" />
            </div>
            <h2 className="font-pixel !mb-0 text-sm text-[#2d2d2d] sm:text-base">Say hi</h2>
          </div>
          <span className="font-pixel text-[0.58rem] tracking-wide text-[#15608f]">
            03 / GET IN TOUCH
          </span>
        </div>

        <div className="flex flex-col items-center gap-5 p-6 text-center sm:p-8">
          <p className="font-body !mb-0 max-w-xl text-base leading-relaxed text-[#595959] sm:text-lg">
            Want better posts for your business, or down to chat about AI and crypto? LinkedIn and X
            are the fastest places to find me.
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
            <a
              href={substackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="nes-btn is-error"
            >
              Substack
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
