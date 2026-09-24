export default function DateRangeFilter({ fromDate, toDate, onFromChange, onToChange }) {
  return (
    <>
      <input
        className="input"
        type="date"
        value={fromDate}
        onChange={(e) => onFromChange(e.target.value)}
        title="Desde"
        aria-label="Desde"
      />
      <input
        className="input"
        type="date"
        value={toDate}
        onChange={(e) => onToChange(e.target.value)}
        title="Hasta"
        aria-label="Hasta"
      />
    </>
  )
}
