import styles from './recommended.module.css';

export default function RecommendedLoading(){
  return <div className={styles.page} aria-busy="true" aria-label="Loading recommendations">
    <header className={styles.hero}><div><div className={styles.eyebrow}>PERSONALISED · RELEVANCE</div><h1>Recommended for you</h1><p>Loading the things that may be most relevant to you right now.</p></div></header>
    <section className={styles.contextCard}><div className={styles.contextIcon} aria-hidden="true">Me</div><div><strong>Loading your recommendation context</strong><p>Checking only the member signals and content you are allowed to use.</p></div></section>
    <section className={styles.section} aria-hidden="true"><div className={styles.sectionHead}><div><div className={styles.eyebrow}>TOP PICKS</div><h2>Most relevant right now</h2></div></div><div className={styles.topGrid}>{[0,1,2].map(item=><article className={styles.pickCard} key={item}><div className={styles.typeLabel}>LOADING</div><h3>Loading recommendation…</h3><p>Checking availability and relevance.</p><div className={styles.reason}><strong>Why this is recommended</strong><p>Loading supported signals.</p></div></article>)}</div></section>
  </div>;
}
