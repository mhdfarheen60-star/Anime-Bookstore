import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { Reveal, StaggeredReveal } from '../../motion/Reveal'
import PostCover, { PostMeta } from '../components/PostCover'
import { formatDate } from '../../utils/format'

// The article body is plain text written by an admin. Blocks are separated by a
// blank line, "## " opens a section heading and "- " a bullet. Nothing is
// injected as HTML, so a post can never execute markup.
const parseContent = (content = '') => {
  const blocks = []
  for (const raw of String(content).split(/\n\s*\n/)) {
    const block = raw.trim()
    if (!block) continue
    if (block.startsWith('## ')) {
      blocks.push({ type: 'heading', text: block.slice(3).trim() })
    } else if (block.startsWith('- ')) {
      blocks.push({ type: 'list', items: block.split('\n').map((l) => l.replace(/^-\s*/, '').trim()).filter(Boolean) })
    } else if (/^###\s/.test(block)) {
      blocks.push({ type: 'subheading', text: block.replace(/^###\s*/, '').trim() })
    } else {
      blocks.push({ type: 'paragraph', text: block.replace(/\n/g, ' ') })
    }
  }
  return blocks
}

const slugifyHeading = (text, index) =>
  `${String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${index}`

const ShareRow = ({ title, slug }) => {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''

  const share = (target) => {
    const u = encodeURIComponent(url)
    const t = encodeURIComponent(title)
    const links = {
      x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    }
    window.open(links[target], '_blank', 'noopener,noreferrer,width=640,height=520')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="eyebrow text-mist">Share</span>
      <button type="button" onClick={copy} className="min-h-10 border border-line px-4 text-xs font-semibold text-moon/80 transition-colors hover:border-electric hover:text-moon">
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      <button type="button" onClick={() => share('x')} className="min-h-10 border border-line px-4 text-xs font-semibold text-moon/80 transition-colors hover:border-electric hover:text-moon">
        X
      </button>
      <button type="button" onClick={() => share('facebook')} className="min-h-10 border border-line px-4 text-xs font-semibold text-moon/80 transition-colors hover:border-electric hover:text-moon">
        Facebook
      </button>
      <button type="button" onClick={() => share('linkedin')} className="min-h-10 border border-line px-4 text-xs font-semibold text-moon/80 transition-colors hover:border-electric hover:text-moon">
        LinkedIn
      </button>
      <span className="sr-only">Article: {title} ({slug})</span>
    </div>
  )
}

function BlogPost() {
  const { slug } = useParams()
  const [state, setState] = useState({ slug: null, status: 'loading' })
  const [related, setRelated] = useState([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.getBlogPost(slug)
        const post = res.data.post
        const relatedRes = await api.getRelatedBlogPosts(slug).catch(() => null)
        if (cancelled) return
        setState({ slug, status: 'ready', post })
        setRelated(relatedRes?.data?.posts ?? [])
      } catch (error) {
        if (cancelled) return
        setState({ slug, status: /not found/i.test(error.message) ? 'missing' : 'error', message: error.message })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug, attempt])

  const blocks = useMemo(
    () => (state.status === 'ready' ? parseContent(state.post?.content) : []),
    [state],
  )

  // A table of contents only helps once an article has a few real sections.
  const headings = blocks
    .map((block, index) => (block.type === 'heading' ? { ...block, id: slugifyHeading(block.text, index) } : null))
    .filter(Boolean)

  const status = state.slug === slug ? state.status : 'loading'

  if (status === 'loading') {
    return (
      <div className="shell py-[clamp(3rem,7vw,6rem)]">
        <div className="animate-pulse">
          <div className="h-3 w-40 bg-panel" />
          <div className="mt-8 h-14 w-3/4 bg-panel" />
          <div className="mt-6 h-4 w-60 bg-panel" />
          <div className="mt-12 aspect-[16/8] bg-panel" />
        </div>
      </div>
    )
  }

  if (status === 'missing' || status === 'error') {
    return (
      <section className="shell py-[clamp(5rem,12vw,10rem)]" role="alert">
        <h1 className="text-headline">{status === 'missing' ? 'That article isn’t here.' : 'This article couldn’t be loaded.'}</h1>
        <p className="mt-6 max-w-md text-mist">
          {status === 'missing'
            ? 'It may have been unpublished, or the link may be out of date.'
            : state.message}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          {status === 'error' && (
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
              Try again
            </button>
          )}
          <Link to="/blog" className="inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">
            Back to the journal
          </Link>
        </div>
      </section>
    )
  }

  const post = state.post
  const wordCount = String(post.content || '').trim().split(/\s+/).filter(Boolean).length

  return (
    <article>
      <header className="shell pt-[clamp(3rem,7vw,6rem)]">
        <nav aria-label="Breadcrumb" className="eyebrow flex flex-wrap items-center gap-3 text-mist">
          <Link to="/blog" className="inline-flex min-h-11 items-center hover:text-moon">Journal</Link>
          <span aria-hidden="true">/</span>
          <span className="text-moon/70">{post.category}</span>
        </nav>

        <p className="eyebrow mt-10 text-electric">{post.category}</p>
        <h1 className="text-headline mt-6 max-w-4xl break-words">{post.title}</h1>
        {post.excerpt && <p className="mt-8 max-w-2xl text-lg leading-relaxed text-moon/85">{post.excerpt}</p>}

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-8 text-sm text-mist">
          <span className="text-moon">{post.author}</span>
          <PostMeta post={post} />
          {post.tags?.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag} className="border border-line px-3 py-1 text-xs text-mist">{tag}</li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {post.coverImage && (
        <div className="shell mt-12">
          <Reveal className="overflow-hidden">
            <PostCover post={post} eager sizes="(min-width: 1536px) 1400px, 100vw" className="aspect-[16/8] w-full object-cover" />
          </Reveal>
        </div>
      )}

      <div className="shell grid gap-12 py-[clamp(3rem,7vw,6rem)] lg:grid-cols-12">
        {/* Table of contents */}
        {headings.length >= 3 && (
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow text-mist">In this article</p>
              <nav aria-label="Table of contents" className="mt-6 border-l border-line">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className="block border-l border-transparent py-2 pl-5 text-sm text-mist transition-colors hover:border-electric hover:text-moon"
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}

        <div className={`${headings.length >= 3 ? 'lg:col-span-8 lg:col-start-5' : 'lg:col-span-9 lg:col-start-3'}`}>
          <div className="max-w-2xl">
            {blocks.map((block, index) => {
              if (block.type === 'heading') {
                return (
                  <h2 key={index} id={slugifyHeading(block.text, index)} className="mt-14 scroll-mt-32 font-display text-2xl font-bold tracking-tight text-moon first:mt-0">
                    {block.text}
                  </h2>
                )
              }
              if (block.type === 'subheading') {
                return (
                  <h3 key={index} className="mt-10 font-display text-lg font-bold tracking-tight text-moon">{block.text}</h3>
                )
              }
              if (block.type === 'list') {
                return (
                  <ul key={index} className="mt-6 space-y-3">
                    {block.items.map((item, i) => (
                      <li key={i} className="flex gap-4 leading-relaxed text-moon/85">
                        <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-electric" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )
              }
              return (
                <p key={index} className="mt-6 leading-relaxed text-moon/85">
                  {block.text}
                </p>
              )
            })}
          </div>

          <div className="mt-14 border-t border-line pt-8">
            <ShareRow title={post.title} slug={post.slug} />
            <p className="mt-6 text-xs text-mist">
              {wordCount} words · {post.readingTime} min read · Published {formatDate(post.publishedAt || post.createdAt)}
            </p>
            <Link to="/blog" className="mt-8 inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-moon transition-colors hover:text-electric">
              <span aria-hidden="true">←</span> Back to the journal
            </Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-posts" className="border-t border-line bg-panel">
          <div className="shell py-[clamp(3.5rem,7vw,6rem)]">
            <p className="eyebrow text-mist">Keep reading</p>
            <h2 id="related-posts" className="text-title mt-5">Related articles</h2>
            <StaggeredReveal className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" step={70}>
              {related.map((item) => (
                <article key={item._id} className="group flex flex-col">
                  <Link to={`/blog/${item.slug}`} className="block aspect-[16/10] overflow-hidden bg-ink">
                    <PostCover post={item} sizes="(min-width: 1024px) 30vw, 90vw" className="transition-transform duration-700 group-hover:scale-[1.04]" />
                  </Link>
                  <p className="eyebrow mt-5 text-electric">{item.category}</p>
                  <h3 className="mt-3 font-display text-lg font-bold leading-snug tracking-tight">
                    <Link to={`/blog/${item.slug}`} className="transition-colors duration-300 hover:text-electric">{item.title}</Link>
                  </h3>
                  <PostMeta post={item} className="mt-3" />
                </article>
              ))}
            </StaggeredReveal>
          </div>
        </section>
      )}
    </article>
  )
}

export default BlogPost
