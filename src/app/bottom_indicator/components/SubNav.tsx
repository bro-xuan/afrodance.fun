"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "../lib/routes";

export function SubNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Bottom indicator sections" className="mb-7 -mx-5 overflow-x-auto px-5">
      <ul className="flex min-w-max gap-1 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0f1724] p-1">
        {SECTIONS.map((s) => {
          const active = pathname === s.href;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? "bg-[#1b2740] text-[#f2f6fb] shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]"
                    : "text-[#8695ac] hover:text-[#e6edf5]"
                }`}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
