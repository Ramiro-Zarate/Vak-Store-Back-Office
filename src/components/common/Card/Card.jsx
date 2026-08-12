import styles from './Card.module.css'

export default function Card({ title, children, className = '', action }) {
  return (
    <section className={`${styles.card} ${className}`}>
      {title && (
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
