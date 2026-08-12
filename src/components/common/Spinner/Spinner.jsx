import styles from './Spinner.module.css'

export default function Spinner({ text = 'Cargando…' }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.spinner} aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}
