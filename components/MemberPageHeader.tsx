import type {ReactNode} from 'react';
import styles from './MemberPageHeader.module.css';

type Props={
  eyebrow:string;
  title:string;
  description:string;
  actions?:ReactNode;
  titleId?:string;
};

export default function MemberPageHeader({eyebrow,title,description,actions,titleId}:Props){
  return <header className={styles.hero}>
    <div className={styles.copy}>
      <div className={styles.eyebrow}>{eyebrow}</div>
      <h1 id={titleId}>{title}</h1>
      <p>{description}</p>
    </div>
    {actions&&<div className={styles.actions}>{actions}</div>}
  </header>;
}
