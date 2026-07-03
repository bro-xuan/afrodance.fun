import SocialLinks from "@/components/SocialLinks";

export default function Footer() {
  return (
    <footer className="px-4 pt-12 pb-8 text-center">
      <div className="flex justify-center">
        <SocialLinks size="medium" />
      </div>
      <p className="font-pixel mt-4 text-xs text-muted-foreground">
        made with pixels &amp; {"<3"}
      </p>
    </footer>
  );
}
