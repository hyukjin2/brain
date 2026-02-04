import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

const navItems = [
  { href: "/params", label: "Parameters" },
  { href: "/training", label: "Training" }
];

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <div>
      <nav className="nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={router.pathname === item.href ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="container">{children}</main>
    </div>
  );
}
