import { useState } from 'react'
import { Icon } from '../icons/Icons.jsx'
import './RatingInput.css'

// OWN Library RatingInput, extended with a controlled value for the admin form.
export default function RatingInput({ max = 5, defaultValue = 0, value, onChange, label = 'Rate this page' }) {
  const [internalRating, setInternalRating] = useState(defaultValue)
  const [hover, setHover] = useState(0)
  const rating = value ?? internalRating
  const shown = hover || rating
  const choose = (n) => {
    if (value === undefined) setInternalRating(n)
    onChange?.(n)
  }
  const onKeyDown = (event, n) => {
    if (!['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1
    const next = ((n - 1 + direction + max) % max) + 1
    choose(next)
    event.currentTarget.parentElement?.querySelector(`[aria-label="${next} star${next > 1 ? 's' : ''}"]`)?.focus()
  }
  return (
    <div className="own-rating">
      <span className="own-rating__label">{label}</span>
      <div className="own-rating__stars" role="radiogroup" aria-label={label}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            tabIndex={n === (rating || 1) ? 0 : -1}
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`own-rating__star${n <= shown ? ' is-on' : ''}`}
            onClick={() => choose(n)}
            onKeyDown={(event) => onKeyDown(event, n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Icon name="star" size={22} fill={n <= shown ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <span className="own-rating__text">{rating > 0 ? `${rating} / ${max}` : 'Not rated yet'}</span>
    </div>
  )
}
