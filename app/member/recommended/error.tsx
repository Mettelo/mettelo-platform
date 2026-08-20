'use client';

import Link from 'next/link';
import styles from './recommended.module.css';

export default function RecommendedError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <div className={styles.page}><header className={styles.hero}><div><div className={styles.eyebrow}>PERSONALISED · RELEVANCE</div><h1>Recommended for you</h1></div></header><section className={styles.empty} role="alert"><h2>We couldn&apos;t load your recommendations</h2><p>Try again, or browse all available member projects in Discover.</p><div className={styles.emptyActions}><button className={`${styles.button} ${styles.primary}`} type="button" onClick={reset}>Try again</button><Link className={styles.button} href="/member/discover">Browse Discover</Link></div></section></div>;
}
