import { useState } from 'react'
import Button from '../vendor/own-ui/button/Button.jsx'
import Input from '../vendor/own-ui/input/Input.jsx'
import Textarea from '../vendor/own-ui/input/Textarea.jsx'
import { Icon } from '../vendor/own-ui/icons/Icons.jsx'
import { api } from '../api.js'
import { CommentItem, Logo, ReviewItem, Stars } from './Shared.jsx'

function FeaturedPost({ post, reviews }) {
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  let host = ''
  try { host = new URL(post.link).hostname.replace(/^www\./, '') } catch { /* validated on the server */ }
  return (
    <article id="featured" className="feature-card">
      <div className="feature-image-wrap">
        <img className="feature-image" src={post.imageUrl} alt={`Featured image for ${post.title}`} />
        <div className="image-caption"><span className="image-caption-icon">✳</span><span>THE GOOD EDIT</span><span className="caption-line" /><span>NO. 01</span></div>
      </div>
      <div className="feature-content">
        <div className="feature-eyebrow"><span className="feature-pill"><span /> FEATURED POST</span><span className="feature-count">01 / 01</span></div>
        <div className="post-brand">
          <Logo post={post} />
          <div><strong>{post.logoName}</strong><span className="brand-category"><Icon name="tag" size={12} /> {post.tag}</span></div>
        </div>
        <h1>{post.title}</h1>
        <p className="feature-description">{post.description}</p>
        <div className="feature-bottom">
          {reviews.length > 0 && <a href="#reviews" className="feature-rating"><Stars rating={average} size={14} /><strong>{average.toFixed(1)}</strong><span>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span></a>}
          <div className="feature-cta">
            <a className="visit-button" href={post.link} target="_blank" rel="noopener noreferrer">Visit website <span aria-hidden="true">↗</span></a>
            {host && <span className="link-host">{host} <Icon name="arrow-right" size={13} /></span>}
          </div>
        </div>
      </div>
    </article>
  )
}

function Reviews({ reviews }) {
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  return (
    <section className="community-card" id="reviews">
      <div className="section-header">
        <div><div className="section-title-line"><h3>Reviews</h3><span className="count-badge">{String(reviews.length).padStart(2, '0')}</span></div><p>Kind words from the community.</p></div>
        <span className="section-icon"><Icon name="star" size={18} /></span>
      </div>
      {reviews.length > 0 ? (
        <>
          <div className="rating-summary"><strong>{average.toFixed(1)}</strong><div><Stars rating={average} size={15} /><p>Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p></div></div>
          <div className="review-list">{reviews.map((review, index) => <ReviewItem key={review.id} review={review} index={index} />)}</div>
        </>
      ) : <p className="empty-state">No reviews yet.</p>}
    </section>
  )
}

function Comments({ comments, onAdd }) {
  const [username, setUsername] = useState(() => { try { return localStorage.getItem('good-edit-username') || '' } catch { return '' } })
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [posted, setPosted] = useState(false)
  const [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    setPosted(false)
    if (!username.trim() || !body.trim()) { setError('Please add your name and comment.'); return }
    setSaving(true)
    try {
      const comment = await api('/api/comments', { method: 'POST', body: JSON.stringify({ username, body }) })
      try { localStorage.setItem('good-edit-username', comment.username) } catch { /* Storage can be disabled. */ }
      setBody('')
      setPosted(true)
      onAdd(comment)
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }
  return (
    <section className="community-card comments-card" id="comments">
      <div className="section-header">
        <div><div className="section-title-line"><h3>Comments</h3><span className="count-badge">{String(comments.length).padStart(2, '0')}</span></div><p>Join the conversation.</p></div>
        <span className="section-icon"><Icon name="message" size={18} /></span>
      </div>
      <form className="comment-form" onSubmit={submit}>
        <Input id="comment-name" label="Your name" placeholder="Enter your name" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={40} required />
        <Textarea id="comment-body" label="Your comment" placeholder="Share a little thought..." value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={3} required />
        <div className="comment-form-footer">
          <span className="form-feedback" role="status">{error || (posted ? 'Comment posted.' : 'No account needed.')}</span>
          <Button type="submit" size="md" iconRight="arrow-right" loading={saving}>Post comment</Button>
        </div>
      </form>
      <div className="comment-list">
        {comments.length ? comments.map((comment, index) => <CommentItem key={comment.id} comment={comment} index={index} />) : <p className="empty-state">Be the first to leave a comment.</p>}
      </div>
    </section>
  )
}

export default function PublicPage({ data, setData }) {
  return (
    <>
      <main className="site-main">
        <div className="intro-row">
          <div><p className="overline"><span className="overline-dot" /> A LITTLE INSPIRATION</p><h2>The latest find<span className="heading-period">.</span></h2></div>
          <div className="issue-number"><span>THE GOOD EDIT</span><b>01</b></div>
        </div>
        <FeaturedPost post={data.post} reviews={data.reviews} />
        <div className="community-heading">
          <div><p className="overline"><span className="overline-dot" /> THE COMMUNITY</p><h2>Better together<span className="heading-period">.</span></h2></div>
          <span className="community-sparkle" aria-hidden="true">✳</span>
        </div>
        <div className="community-grid">
          <Reviews reviews={data.reviews} />
          <Comments comments={data.comments} onAdd={(comment) => setData((current) => ({ ...current, comments: [comment, ...current.comments] }))} />
        </div>
      </main>
      <footer className="site-footer"><span>the good edit<span className="brand-period">.</span></span><span>ONE GOOD THING, AT A TIME.</span></footer>
    </>
  )
}
