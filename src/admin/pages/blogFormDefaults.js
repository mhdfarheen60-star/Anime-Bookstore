// Default values for the blog form, kept separate from the component so that file
// only exports a component (required for fast refresh).
export const emptyBlogForm = {
  id: null,
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: 'Journal',
  author: '',
  status: 'draft',
  featured: false,
  tags: [],
}

export default emptyBlogForm
