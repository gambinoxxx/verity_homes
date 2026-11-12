// design/post.html pieces: category tag (hero), share row, author box.
import Image from "next/image";
import { postShareLinks } from "@/lib/blog";
import { MailIcon, WhatsAppIcon } from "../icons";
import { ShareButton } from "../property/share-button";
import styles from "./post.module.css";

/** Gold category tag above the post title (design `.prop-tag.gold`). */
export function CategoryTag({ name }: { name: string }) {
  return <span className={styles.tag}>{name}</span>;
}

/** Share on WhatsApp (title + URL), by email, or with the native share sheet (copy fallback). */
export function PostShare({ title, url }: { title: string; url: string }) {
  const links = postShareLinks(title, url);
  return (
    <div className={styles.share}>
      <span aria-hidden="true">Share</span>
      <a
        href={links.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
      >
        <WhatsAppIcon />
      </a>
      <a href={links.email} aria-label="Share by email">
        <MailIcon />
      </a>
      <ShareButton
        title={title}
        url={url}
        label="Share on other apps"
        noteClassName={styles.note}
      />
    </div>
  );
}

const CEO_NAME = "Esther Ezenagu";

/**
 * Author box. The CEO's photo and title show only for posts by her; any other author name gets
 * the name alone (authors aren't managed yet, so no other photo or title is known).
 */
export function AuthorBox({ name }: { name: string }) {
  const isCeo = name === CEO_NAME;
  return (
    <div className={styles.author}>
      {isCeo ? <Image src="/samples/ceo.jpg" alt="" width={72} height={72} sizes="72px" /> : null}
      <div>
        <b>{name}</b>
        {isCeo ? <p>Founder &amp; CEO, Verity Homes and Properties</p> : null}
      </div>
    </div>
  );
}
