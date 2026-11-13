import Link from "next/link";
import { Logo } from "../site/logo";
import styles from "./auth-screen.module.css";

/** Navy full-screen frame with the Verity Admin mark, for sign-in and no-access. */
export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.screen}>
      <Link href="/" className={styles.brand} aria-label="Verity Homes and Properties — website">
        <Logo />
        <span>
          <b>VERITY</b>
          <small>ADMIN</small>
        </span>
      </Link>
      {children}
      <Link href="/" className={styles.back}>
        ← Back to the website
      </Link>
    </main>
  );
}

export const authScreenStyles = styles;
