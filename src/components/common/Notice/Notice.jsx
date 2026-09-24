export default function Notice({ notice }) {
  if (!notice?.text) return null

  return (
    <div className={`alert ${notice.type === 'error' ? 'alert-error' : 'alert-success'}`}>
      {notice.text}
    </div>
  )
}
