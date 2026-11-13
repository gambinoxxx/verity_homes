"use client";

// Admin shell (design/admin.html): navy sidebar + main column. At ≤860px the sidebar is an
// off-canvas drawer: the topbar's menu button opens it; Esc, the backdrop, a link or a route
// change closes it; while closed it is `inert` so hidden links can't take focus.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ADMIN_NAV, isActiveAdminLink } from "@/lib/admin-nav";
import { UserButton } from "@/lib/auth/components";
import { Logo } from "../site/logo";
import { AdminIcon } from "./icons";
import styles from "./admin-shell.module.css";

type ShellContext = {
  open: boolean;
  toggle: () => void;
  greeting: string;
  firstName: string | null;
};

const Ctx = createContext<ShellContext | null>(null);
const SIDEBAR_ID = "admin-sidebar";
const TOGGLE_ID = "admin-menu-toggle";
const MOBILE = "(max-width: 860px)";
const ENQUIRIES_HREF = "/admin/enquiries";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

type AdminShellProps = {
  children: React.ReactNode;
  greeting: string;
  firstName: string | null;
  /** NEW enquiries: the count badge on the sidebar's "Enquiries" link (hidden at 0). */
  newEnquiries: number;
};

export function AdminShell({ children, greeting, firstName, newEnquiries }: AdminShellProps) {
  const pathname = usePathname();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Close the drawer when the route changes (state adjusted during render, no effect needed).
  if (open && openedAt !== pathname) {
    setOpen(false);
  }

  const close = useCallback(() => {
    setOpen(false);
    document.getElementById(TOGGLE_ID)?.focus();
  }, []);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
    setOpenedAt(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the drawer.
    document.querySelector<HTMLElement>(`#${SIDEBAR_ID} a`)?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const drawerOpen = mobile && open;

  return (
    <Ctx.Provider value={{ open: drawerOpen, toggle, greeting, firstName }}>
      <div className={styles.shell}>
        <aside
          id={SIDEBAR_ID}
          className={`${styles.sidebar} ${drawerOpen ? styles.open : ""}`}
          aria-label="Admin navigation"
          inert={mobile && !open}
        >
          <Link href="/admin" className={styles.brand} prefetch={false}>
            <Logo />
            <span>
              <b>VERITY</b>
              <small>ADMIN</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Admin">
            {ADMIN_NAV.map((group, gi) => (
              <div key={group.label ?? gi} className="contents">
                {group.label ? (
                  <span className={styles.group} aria-hidden="true">
                    {group.label}
                  </span>
                ) : null}
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    aria-current={isActiveAdminLink(pathname, item.href) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <AdminIcon name={item.icon} />
                    {item.label}
                    {item.href === ENQUIRIES_HREF && newEnquiries > 0 ? (
                      <span className={styles.count} data-testid="new-enquiries-badge">
                        {newEnquiries}
                        <span className="sr-only"> new</span>
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className={styles.foot}>
            Signed in with Clerk ·{" "}
            <a href="/" target="_blank" rel="noopener noreferrer">
              View site
            </a>
          </div>
        </aside>
        {drawerOpen ? (
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close navigation"
            onClick={close}
          />
        ) : null}
        <div className={styles.main}>{children}</div>
      </div>
    </Ctx.Provider>
  );
}

type AdminTopbarProps = {
  /** The page's only <h1>. */
  title: string;
  /** Small line above the title; defaults to the greeting ("Good afternoon, Esther"). */
  crumb?: React.ReactNode;
  /** Buttons on the right, before the user menu. */
  actions?: React.ReactNode;
};

/** White sticky top bar: menu button (mobile), greeting/crumb + title, actions, user menu. */
export function AdminTopbar({ title, crumb, actions }: AdminTopbarProps) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AdminTopbar must be inside AdminShell");
  const hello = ctx.firstName ? `${ctx.greeting}, ${ctx.firstName}` : ctx.greeting;
  return (
    <header className={styles.topbar}>
      <div className={styles.titleWrap}>
        <button
          id={TOGGLE_ID}
          type="button"
          className={styles.menuToggle}
          aria-label={ctx.open ? "Close navigation" : "Open navigation"}
          aria-controls={SIDEBAR_ID}
          aria-expanded={ctx.open}
          onClick={ctx.toggle}
        >
          <AdminIcon name={ctx.open ? "close" : "menu"} />
        </button>
        <div>
          <div className={styles.crumb}>{crumb ?? hello}</div>
          <h1>{title}</h1>
        </div>
      </div>
      <div className={styles.right}>
        {actions}
        <div className={styles.user}>
          <UserButton />
          {ctx.firstName ? <span className={styles.userName}>{ctx.firstName}</span> : null}
        </div>
      </div>
    </header>
  );
}

/** Page body padding (design `.content`). */
export function AdminContent({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className={styles.content}>
      {children}
    </main>
  );
}
