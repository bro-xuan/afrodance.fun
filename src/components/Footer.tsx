export default function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[#595959]">
        <span className="font-body">afrodance.fun · Stefan Wang</span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-body text-sm text-[#595959]">
            Secret: <span className="font-body font-semibold text-[#4a7c10]">↑↑↓↓←→←→BA</span>
          </span>
          <a
            href="#"
            className="font-body text-sm font-semibold !text-[#4a7c10] !no-underline hover:opacity-75"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
