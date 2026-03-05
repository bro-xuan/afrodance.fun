const dots = [
  "bg-[#6aad30]",
  "bg-[#3498db]",
  "bg-[#e6b800]",
  "bg-[#e07460]",
  "bg-[#6aad30]",
  "bg-[#3498db]",
  "bg-[#e6b800]",
  "bg-[#e07460]",
  "bg-[#6aad30]",
];

export default function PixelDivider() {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {dots.map((color, i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 ${color}`}
          style={{ opacity: 1 - Math.abs(i - 4) * 0.15 }}
        />
      ))}
    </div>
  );
}
