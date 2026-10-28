// Example content so a new installation has a complete post to edit.
export function createSeed() {
  const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  return {
    post: {
      logoName: 'STILL FORM',
      logoImage: '',
      tag: 'LIFESTYLE',
      imageUrl: '/images/quiet-morning.jpg',
      title: 'Make room for the little things.',
      description: 'Thoughtful pieces for slower mornings and more meaningful everyday moments. A little inspiration to make your space feel more like you.',
      link: 'https://example.com',
    },
    reviews: [
      { id: 'sample-review-1', name: 'Olivia R.', rating: 5, text: 'Beautifully simple. Exactly the kind of inspiration I was looking for.', createdAt: daysAgo(2) },
      { id: 'sample-review-2', name: 'Daniel K.', rating: 5, text: 'A lovely reminder to appreciate the little things.', createdAt: daysAgo(5) },
      { id: 'sample-review-3', name: 'Sophie M.', rating: 4, text: 'Thoughtful, calming, and wonderfully put together.', createdAt: daysAgo(9) },
    ],
    // Visitors create the comments; a new install starts without invented comments.
    comments: [],
  }
}
