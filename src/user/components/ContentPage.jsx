import { Link } from 'react-router-dom'
import { Reveal } from '../../motion/Reveal'

/**
 * Shared shell for the editorial pages (About, FAQ, guides, policies).
 *
 * `sections` is a list of { id, heading, paragraphs?, bullets?, note? } blocks.
 * Everything is rendered as plain text, never as raw HTML, so admin- or
 * owner-supplied copy can never inject markup.
 */
export function ContentPage({ eyebrow, title, lede, updated, sections = [], children, breadcrumb }) {
  return (
    <div>
      <header className="shell pt-[clamp(3rem,8vw,7rem)] pb-[clamp(2rem,4vw,3.5rem)]">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="eyebrow mb-8 flex flex-wrap items-center gap-3 text-mist">
            <Link to={breadcrumb.to} className="inline-flex min-h-11 items-center hover:text-moon">{breadcrumb.label}</Link>
            <span aria-hidden="true">/</span>
            <span className="text-moon/70">{title}</span>
          </nav>
        )}
        {eyebrow && <p className="eyebrow text-mist"><span className="text-electric">(Book Store)</span> — {eyebrow}</p>}
        <h1 className="text-headline mt-8 max-w-4xl break-words">{title}</h1>
        {lede && <p className="mt-8 max-w-2xl text-lg leading-relaxed text-moon/85">{lede}</p>}
        {updated && <p className="mt-6 text-sm text-mist">Last updated: {updated}</p>}
      </header>

      <div className="shell pb-[clamp(4rem,9vw,8rem)]">
        <div className="max-w-3xl border-t border-line pt-12">
          {sections.map((section, index) => (
            <Reveal as="section" key={section.id ?? index} delay={index * 40} className="mb-14 scroll-mt-32">
              {section.heading && (
                <h2 className="font-display text-xl font-bold tracking-tight text-moon sm:text-2xl">{section.heading}</h2>
              )}
              {section.paragraphs?.map((paragraph, i) => (
                <p key={i} className="mt-5 leading-relaxed text-moon/85">{paragraph}</p>
              ))}
              {section.bullets?.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {section.bullets.map((item, i) => (
                    <li key={i} className="flex gap-4 leading-relaxed text-moon/85">
                      <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-electric" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.note && (
                <p className="mt-6 border-l-2 border-electric/50 bg-panel/60 px-5 py-4 text-sm leading-relaxed text-mist">
                  {section.note}
                </p>
              )}
            </Reveal>
          ))}
          {children}
        </div>
      </div>
    </div>
  )
}

export default ContentPage
