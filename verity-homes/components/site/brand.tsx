import Link from "next/link";
import { Logo } from "./logo";
import styles from "./brand.module.css";

type BrandProps = { onClick?: () => void };

/**
 * Logo + VERITY wordmark, linking home. Used in the header, drawer and footer.
 * The visible wordmark is the accessible name (WCAG 2.5.3 label-in-name), plus "home".
 */
export function Brand({ onClick }: BrandProps) {
  return (
    <Link href="/" className={styles.brand} onClick={onClick}>
      <Logo />
      <span>
        <b>VERITY</b>
        <small>
          Homes &amp; Properties<span className="sr-only"> — home</span>
        </small>
      </span>
    </Link>
  );
}
