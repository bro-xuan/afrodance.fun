import Link from "next/link";

const sounds = [
  "bruh", "cartoon-bonk", "fail-buzzer", "get-back-to-work",
  "gordon-ramsay", "gta-wasted", "jontron-excuse-me-what", "mgs-alert",
  "navi-hey-listen", "pay-attention", "sad-trombone",
  "shrek-what-are-you-doing", "vine-boom", "what-are-you-doing", "wrong-buzzer",
];

export default function ADHDSaverPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="font-pixel text-xs mb-8 inline-block hover:underline">
        &larr; back to afrodance.fun
      </Link>

      <div className="nes-container with-title">
        <p className="title font-pixel">ADHD Saver</p>

        <div className="flex flex-col items-center gap-6 p-4">
          <span className="text-6xl">🧠</span>

          <p className="font-body text-lg text-center max-w-2xl">
            A desktop focus monitor that uses your webcam to detect when you look
            away from the screen — then plays escalating sound alerts to get you
            back on track. Built with Python, OpenCV, and MediaPipe.
          </p>

          <div className="nes-container is-dark w-full">
            <p className="font-pixel text-xs mb-4">How it works</p>
            <ol className="font-body text-sm list-decimal list-inside space-y-2">
              <li>Calibrates your &quot;focused&quot; head position on startup</li>
              <li>Tracks head pose (yaw &amp; pitch) in real-time via webcam</li>
              <li>Grace period before first alert (default 3s)</li>
              <li>
                3-level escalation: gentle → medium → aggressive sounds
              </li>
              <li>Customizable thresholds, cooldowns, and sound packs</li>
            </ol>
          </div>

          <div className="nes-container w-full">
            <p className="font-pixel text-xs mb-4">Quick start</p>
            <pre className="font-body text-sm bg-[#2d2d2d] text-[#e0e0e0] p-4 rounded overflow-x-auto">
{`git clone https://github.com/bro-xuan/adhd-cure.git
cd adhd-cure
pip install -r requirements.txt
python main.py`}
            </pre>
          </div>

          <div className="nes-container w-full">
            <p className="font-pixel text-xs mb-4">Sound pack ({sounds.length} alerts)</p>
            <div className="flex flex-wrap gap-2">
              {sounds.map((s) => (
                <span key={s} className="nes-badge">
                  <span className="is-primary font-body text-xs">{s}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="nes-container w-full">
            <p className="font-pixel text-xs mb-4">Settings</p>
            <table className="font-body text-sm w-full">
              <tbody>
                <tr><td className="pr-4 py-1 font-bold">Yaw threshold</td><td>30&deg;</td></tr>
                <tr><td className="pr-4 py-1 font-bold">Pitch down</td><td>15&deg;</td></tr>
                <tr><td className="pr-4 py-1 font-bold">Pitch up</td><td>20&deg;</td></tr>
                <tr><td className="pr-4 py-1 font-bold">Grace period</td><td>3s</td></tr>
                <tr><td className="pr-4 py-1 font-bold">Cooldown</td><td>10s</td></tr>
                <tr><td className="pr-4 py-1 font-bold">Escalation</td><td>15s</td></tr>
              </tbody>
            </table>
            <p className="font-body text-xs text-muted-foreground mt-2">
              All settings adjustable via live GUI trackbars or CLI flags.
            </p>
          </div>

          <div className="flex gap-4 mt-4">
            <a
              href="https://github.com/bro-xuan/adhd-cure"
              target="_blank"
              rel="noopener noreferrer"
              className="nes-btn is-primary font-pixel text-xs"
            >
              GitHub repo
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
