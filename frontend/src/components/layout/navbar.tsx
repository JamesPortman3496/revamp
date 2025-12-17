"use client";

import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./theme-toggle";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/detect-changes", label: "Detect Changes" },
    { href: "/golden-thread", label: "Golden Thread" },
    { href: "/document-map", label: "Document Map" },
  ];

  return (
    <nav className="flex items-center justify-between px-5 py-2.5 bg-surface border-b border-border/70 backdrop-blur-md sticky top-0 z-10 shadow-[inset_0_-2px_0_0_var(--accent-3)]">
      <div className="flex items-center space-x-5">
        <div
          aria-label="Sellafield"
          className="h-9 w-36 text-foreground"
          style={{
            backgroundColor: "currentColor",
            WebkitMaskImage: "url(/Sellafield_navbar_logo.png)",
            maskImage: "url(/Sellafield_navbar_logo.png)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "left center",
            maskPosition: "left center",
          }}
        />
        {links.map((link) => {
          const isActive =
            pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={`px-2 py-1 rounded-md transition-colors font-semibold ${
                isActive ? "text-accent-3" : "text-muted-foreground hover:text-accent-3"
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
      <ThemeToggle />
    </nav>
  );
}
