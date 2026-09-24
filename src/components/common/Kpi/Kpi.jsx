import Card from '../Card/Card'
import styles from './Kpi.module.css'

export function KpiGrid({ children }) {
  return <div className={styles.grid}>{children}</div>
}

export function KpiCard({ label, value, sub, tone = 'accent' }) {
  return (
    <Card className={`${styles.card} ${styles[tone] ?? styles.accent}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </Card>
  )
}
