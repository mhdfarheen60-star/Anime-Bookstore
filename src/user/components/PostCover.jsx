import { useState } from 'react'
import { resolveCoverUrl } from '../../utils/coverUrl'
import { formatDate } from '../../utils/format'

/**
 * Thumbnail for a blog post. Falls back to a typographic plate when the post
 * has no image, so a card never collapses into an empty hole.
 */
function PostCover({ post, className = '', sizes, eager = false }) {
  const [failed, setFailed] = useState(false)
  const label = post?.title ?? ''
  const src = post?.coverImage ? resolveCoverUrl(post.coverImage) : null

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={label}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        sizes={sizes}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-panel ${className}`}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(120% 90% at 20% 0%, rgba(59,130,246,0.12), transparent 60%)' }}
      />
      <span className="font-jp text-5xl leading-none text-electric/70">本</span>
    </div>
  )
}

/** "12 Mar 2026 · 4 min read" */
export function PostMeta({ post, className = '' }) {
  const date = formatDate(post?.publishedAt || post?.createdAt)
  const minutes = post?.readingTime
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mist ${className}`}>
      {date && <time dateTime={post?.publishedAt || post?.createdAt}>{date}</time>}
      {date && minutes ? <span aria-hidden="true">·</span> : null}
      {minutes ? <span>{minutes} min read</span> : null}
    </p>
  )
}

export default PostCover
