"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/applications", label: "Applications" },
  { href: "/resume", label: "Resume" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside className="sidebar" data-open={open}>
      <div className="sidebar-head">
        <Link href="/" className="brand">
          Leyp
        </Link>
        <button
          type="button"
          className="button secondary"
          aria-expanded={open}
          aria-controls="sidebar-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide" : "Menu"}
        </button>
      </div>

      <nav id="sidebar-nav" aria-label="Main">
        <ul>
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link href={link.href} aria-current={active ? "page" : undefined}>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form action="/logout" method="post" className="sidebar-foot">
        <button type="submit" className="button secondary">
          Sign out
        </button>
      </form>
    </aside>
  );
}
