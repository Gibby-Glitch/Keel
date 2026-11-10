"use client";

import Link from "next/link";
import { MORE_LINKS } from "@/components/Shell";
import { PageHead } from "@/components/ui";

export default function MorePage() {
  return (
    <>
      <PageHead title="More" />
      <ul className="divide-y divide-line border-y border-line">
        {MORE_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 py-4 text-[17px]">
              <Icon size={20} className="text-tide" strokeWidth={1.8} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
