import { Avatar } from '../vendor/own-ui/data/Avatar.jsx'
import IconButton from '../vendor/own-ui/button/IconButton.jsx'
import { Icon } from '../vendor/own-ui/icons/Icons.jsx'

export function BrandMark({ small = false }) {
  return (
    <span className={`brand-mark${small ? ' brand-mark--small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none"><path d="M16 3.5c1.2 7.3 5.2 11.3 12.5 12.5-7.3 1.2-11.3 5.2-12.5 12.5C14.8 21.2 10.8 17.2 3.5 16 10.8 14.8 14.8 10.8 16 3.5Z" fill="currentColor" /></svg>
    </span>
  )
}

export function Header({ theme, onToggleTheme, admin = false }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="site-brand" href="/" aria-label="The Good Edit home">
          <BrandMark />
          <span>the good edit<span className="brand-period">.</span></span>
        </a>
        {!admin && (
          <nav className="main-nav" aria-label="Main navigation">
            <a className="nav-active" href="#featured">Discover</a>
            <a href="#reviews">Reviews</a>
            <a href="#comments">Comments</a>
          </nav>
        )}
        <div className="header-actions">
          <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} variant="ghost" onClick={onToggleTheme} />
          <span className="header-divider" />
          <a className={`admin-link${admin ? ' is-current' : ''}`} href={admin ? '/' : '/admin'}>
            <Icon name={admin ? 'arrow-left' : 'lock'} size={15} />
            <span>{admin ? 'View post' : 'Admin'}</span>
          </a>
        </div>
      </div>
    </header>
  )
}

export function Stars({ rating, size = 14 }) {
  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Icon key={index} name="star" size={size} fill={index < Math.round(rating) ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
}

export function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase() || '?'
}

export function PersonAvatar({ name, index = 0 }) {
  const tones = ['accent', 'success', 'warning', 'neutral']
  return <Avatar initials={initials(name)} tone={tones[index % tones.length]} size="md" />
}

export function relativeDate(date) {
  const timestamp = new Date(date).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const difference = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(difference / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: new Date(date).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }).format(new Date(date))
}

export function Logo({ post }) {
  return (
    <span className="post-logo" aria-hidden="true">
      {post.logoImage ? <img src={post.logoImage} alt="" /> : <span>{(Array.from(post.logoName)[0] || '?').toUpperCase()}</span>}
    </span>
  )
}

export function ReviewItem({ review, index = 0, actions }) {
  return (
    <div className="review-item">
      <PersonAvatar name={review.name} index={index} />
      <div className="review-body">
        <div className="review-meta"><strong>{review.name}</strong><Stars rating={review.rating} size={12} /></div>
        <p>{review.text}</p>
        {actions && <div className="review-actions">{actions}</div>}
      </div>
    </div>
  )
}

export function CommentItem({ comment, index = 0 }) {
  return (
    <div className="comment-item">
      <PersonAvatar name={comment.username} index={index + 1} />
      <div className="comment-body">
        <div className="comment-meta"><strong>{comment.username}</strong><time dateTime={comment.createdAt}>{relativeDate(comment.createdAt)}</time></div>
        <p>{comment.body}</p>
      </div>
    </div>
  )
}
