import styles from './Badge.module.css'

const toneMap = {
  neutral: styles.neutral,
  green: styles.green,
  red: styles.red,
  amber: styles.amber,
  blue: styles.blue,
  purple: styles.purple,
}

export default function Badge({ tone = 'neutral', children }) {
  return <span className={`${styles.badge} ${toneMap[tone] ?? toneMap.neutral}`}>{children}</span>
}
