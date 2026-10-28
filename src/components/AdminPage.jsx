import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../vendor/own-ui/button/Button.jsx'
import Input from '../vendor/own-ui/input/Input.jsx'
import Textarea from '../vendor/own-ui/input/Textarea.jsx'
import RatingInput from '../vendor/own-ui/input/RatingInput.jsx'
import Modal from '../vendor/own-ui/feedback/Modal.jsx'
import { Icon } from '../vendor/own-ui/icons/Icons.jsx'
import { api } from '../api.js'
import { CommentItem, ReviewItem } from './Shared.jsx'

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
      setPassword('')
      onLogin()
    } catch (requestError) { setError(requestError.message) }
    finally { setLoading(false) }
  }
  return (
    <main className="login-page">
      <div className="login-card">
        <span className="login-icon"><Icon name="lock" size={22} /></span>
        <p className="overline"><span className="overline-dot" /> ADMIN ACCESS</p>
        <h1>Welcome back<span className="heading-period">.</span></h1>
        <p className="login-subtitle">Sign in to manage your post.</p>
        <form className="login-form" onSubmit={submit}>
          <Input id="admin-password" type="password" label="Admin password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" allowPasswordToggle required />
          {error && <p className="error-message" role="alert">{error}</p>}
          <Button type="submit" size="lg" fullWidth loading={loading}>Continue</Button>
        </form>
        <a className="back-link" href="/"><Icon name="arrow-left" size={15} /> Back to the post</a>
      </div>
    </main>
  )
}

function ImageField({ id, label, value, onChange, optional = false }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const dataImage = value.startsWith('data:')
  function chooseFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('Choose a JPG, PNG, WEBP or GIF image.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Choose an image under 2 MB.'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result))
    reader.onerror = () => setError('Could not read this image. Please try again.')
    reader.readAsDataURL(file)
  }
  return (
    <div className="image-field">
      <span className="field-heading">{label} {optional && <small>Optional</small>}</span>
      <div className="image-field-row">
        <div className={`image-preview${optional ? ' image-preview--logo' : ''}`}>
          {value ? <img src={value} alt={`${label} preview`} /> : <Icon name="image" size={21} />}
        </div>
        <div className="image-field-controls">
          <div className="image-buttons">
            <Button variant="secondary" size="sm" icon="upload" onClick={() => inputRef.current?.click()}>Upload image</Button>
            {optional && value && <Button variant="ghost" size="sm" onClick={() => onChange('')}>Remove</Button>}
          </div>
          <p>JPG, PNG, WEBP or GIF · max 2 MB</p>
          <input ref={inputRef} className="visually-hidden" id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile} aria-label={`Upload ${label.toLowerCase()}`} />
        </div>
      </div>
      <Input id={id} label="Or use an image URL" placeholder={dataImage ? 'Image uploaded' : 'https://...'} value={dataImage ? '' : value} onChange={(event) => onChange(event.target.value)} />
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  )
}

function PostEditor({ post, onSave }) {
  const [form, setForm] = useState(post)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => setForm(post), [post])
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); setMessage(''); setError('') }
  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const saved = await api('/api/admin/post', { method: 'PUT', body: JSON.stringify(form) })
      onSave(saved)
      setMessage('Your post has been saved.')
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }
  return (
    <form className="editor-form" onSubmit={submit}>
      <div className="panel-heading"><div><h2>Featured post</h2><p>Update the one post your visitors see.</p></div><Button type="submit" icon="check" loading={saving}>Save changes</Button></div>
      {(message || error) && <p className={error ? 'form-alert is-error' : 'form-alert'} role="status">{error || message}</p>}
      <div className="editor-section">
        <div className="editor-section-title"><h3>Post details</h3><p>The essentials for your featured post.</p></div>
        <div className="field-grid">
          <Input id="post-logo-name" label="Logo name" value={form.logoName} onChange={(event) => update('logoName', event.target.value)} maxLength={60} required />
          <Input id="post-tag" label="Tag" value={form.tag} onChange={(event) => update('tag', event.target.value)} maxLength={32} required />
        </div>
        <Input id="post-title" label="Title" value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={120} required />
        <Textarea id="post-description" label="Description" value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={3000} rows={5} required />
        <Input id="post-link" label="Website link" value={form.link} onChange={(event) => update('link', event.target.value)} placeholder="https://example.com" maxLength={2048} required />
      </div>
      <div className="editor-section media-section">
        <div className="editor-section-title"><h3>Images</h3><p>Add an image and an optional logo.</p></div>
        <ImageField id="post-image" label="Featured image" value={form.imageUrl} onChange={(value) => update('imageUrl', value)} />
        <ImageField id="post-logo-image" label="Logo image" value={form.logoImage} onChange={(value) => update('logoImage', value)} optional />
      </div>
      <div className="editor-bottom"><Button type="submit" icon="check" loading={saving}>Save changes</Button></div>
    </form>
  )
}

function ReviewManager({ reviews, setData }) {
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const closeDialog = useCallback(() => { setDraft(null); setError('') }, [])
  function openReview(review) { setNotice(''); setError(''); setDraft(review ? { ...review } : { name: '', rating: 5, text: '' }) }
  function update(field, value) { setDraft((current) => ({ ...current, [field]: value })) }
  async function saveReview(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const isEdit = Boolean(draft.id)
      const saved = await api(isEdit ? `/api/admin/reviews/${encodeURIComponent(draft.id)}` : '/api/admin/reviews', {
        method: isEdit ? 'PUT' : 'POST', body: JSON.stringify({ name: draft.name, rating: draft.rating, text: draft.text }),
      })
      setData((current) => ({ ...current, reviews: isEdit ? current.reviews.map((item) => item.id === saved.id ? saved : item) : [saved, ...current.reviews] }))
      closeDialog()
      setNotice(isEdit ? 'Review updated.' : 'Review added.')
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }
  async function deleteReview(review) {
    if (!window.confirm(`Delete the review by ${review.name}?`)) return
    setNotice('')
    try {
      await api(`/api/admin/reviews/${encodeURIComponent(review.id)}`, { method: 'DELETE' })
      setData((current) => ({ ...current, reviews: current.reviews.filter((item) => item.id !== review.id) }))
      setNotice('Review deleted.')
    } catch (requestError) { setNotice(requestError.message) }
  }
  return (
    <div className="manager-panel">
      <div className="panel-heading"><div><h2>Reviews</h2><p>Create and manage the reviews on your post.</p></div><Button icon="plus" onClick={() => openReview()}>Add review</Button></div>
      {notice && <p className="form-alert" role="status">{notice}</p>}
      <div className="admin-list">
        {reviews.length ? reviews.map((review, index) => <ReviewItem key={review.id} review={review} index={index} actions={<><Button variant="ghost" size="sm" onClick={() => openReview(review)}>Edit</Button><Button variant="ghost" size="sm" onClick={() => deleteReview(review)}>Delete</Button></>} />) : <p className="empty-state">No reviews yet. Add your first review.</p>}
      </div>
      <Modal open={Boolean(draft)} onClose={closeDialog} title={draft?.id ? 'Edit review' : 'Add review'} size="md">
        {draft && <form className="review-form" onSubmit={saveReview}>
          <Input id="review-name" label="Name" placeholder="Reviewer name" value={draft.name} onChange={(event) => update('name', event.target.value)} maxLength={60} required />
          <RatingInput label="Rating" value={draft.rating} onChange={(value) => update('rating', value)} />
          <Textarea id="review-text" label="Review" placeholder="Write a review" value={draft.text} onChange={(event) => update('text', event.target.value)} rows={4} maxLength={1000} required />
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="modal-actions"><Button variant="secondary" onClick={closeDialog}>Cancel</Button><Button type="submit" loading={saving}>{draft.id ? 'Save review' : 'Add review'}</Button></div>
        </form>}
      </Modal>
    </div>
  )
}

function CommentManager({ comments }) {
  return (
    <div className="manager-panel">
      <div className="panel-heading"><div><h2>Comments</h2><p>See what visitors are saying.</p></div><span className="count-badge count-badge--large">{comments.length}</span></div>
      <div className="admin-list">
        {comments.length ? comments.map((comment, index) => <CommentItem key={comment.id} comment={comment} index={index} />) : <p className="empty-state">No comments yet.</p>}
      </div>
    </div>
  )
}

export default function AdminPage({ authenticated, setAuthenticated, data, setData }) {
  const [tab, setTab] = useState('post')
  async function logOut() {
    try { await api('/api/admin/logout', { method: 'POST' }) } finally { setAuthenticated(false) }
  }
  if (!authenticated) return <AdminLogin onLogin={() => setAuthenticated(true)} />
  const items = [
    { id: 'post', label: 'Featured post', icon: 'image' },
    { id: 'reviews', label: 'Reviews', icon: 'star', count: data.reviews.length },
    { id: 'comments', label: 'Comments', icon: 'message', count: data.comments.length },
  ]
  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div><p className="overline"><span className="overline-dot" /> YOUR SPACE</p><h1>Admin panel<span className="heading-period">.</span></h1><p>Everything you need, all in one place.</p></div>
        <Button variant="secondary" icon="logout" onClick={logOut}>Sign out</Button>
      </div>
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Admin sections">
          <p>MANAGE</p>
          {items.map((item) => <button key={item.id} type="button" className={`admin-nav-item${tab === item.id ? ' is-active' : ''}`} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}><Icon name={item.icon} size={17} /><span>{item.label}</span>{item.count !== undefined && <small>{item.count}</small>}</button>)}
        </aside>
        <section className="admin-content" aria-live="polite">
          {tab === 'post' && <PostEditor post={data.post} onSave={(post) => setData((current) => ({ ...current, post }))} />}
          {tab === 'reviews' && <ReviewManager reviews={data.reviews} setData={setData} />}
          {tab === 'comments' && <CommentManager comments={data.comments} />}
        </section>
      </div>
    </main>
  )
}
