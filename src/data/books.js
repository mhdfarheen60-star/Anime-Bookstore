// Transform API book data to the shape the UI components consume.
export function transformBook(apiBook) {
  return {
    id: apiBook._id || apiBook.id,
    _id: apiBook._id,
    title: apiBook.title,
    author: apiBook.author,
    description: apiBook.description,
    price: apiBook.price,
    originalPrice: apiBook.originalPrice,
    genre: apiBook.category?.name || apiBook.category?.slug || apiBook.genre,
    rating: apiBook.rating,
    trending: apiBook.featured,
    image: apiBook.coverImage || '',
    series: apiBook.series,
    volumeNumber: apiBook.volumeNumber,
    colors: apiBook.colors || ['#3b2a20', '#8a3b2b'],
    glyph: apiBook.glyph || '书',
    stock: apiBook.stock,
    isActive: apiBook.isActive,
    category: apiBook.category,
    isbn: apiBook.isbn,
    publisher: apiBook.publisher,
    publishedYear: apiBook.publishedYear,
    language: apiBook.language,
    discountPercent: apiBook.discountPercent,
    illustrator: apiBook.illustrator,
    edition: apiBook.edition,
    pages: apiBook.pages,
    format: apiBook.format,
    publicationDate: apiBook.publicationDate,
    seriesStatus: apiBook.seriesStatus,
    tags: apiBook.tags || [],
    reviewCount: apiBook.reviewCount,
  };
}

export function transformBooks(apiBooks) {
  return apiBooks.map(transformBook);
}
