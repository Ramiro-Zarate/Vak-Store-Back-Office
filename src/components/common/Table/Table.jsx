import styles from './Table.module.css'

export default function Table({ columns, children }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={col === 'Acciones' ? { textAlign: 'right' } : undefined}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
