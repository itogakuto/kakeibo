// router/index.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/** 表示用に YYYY-MM-DD に整形 */
function ymd(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

router.get('/', async (req, res, next) => {
  try {
    const posts = await prisma.blog.findMany({
      orderBy: { postedAt: 'desc' },
    });
    const viewPosts = posts.map(p => ({ ...p, dateStr: ymd(p.postedAt) }));
    res.render('index', {
      title: 'My Blog',
      posts: viewPosts,
      errors: [],
      form: { title: '', postedAt: ymd(new Date()), content: '' },
      searchMode: false,
      keyword: ''
    });
  } catch (e) {
    next(e);
  }
});

// 要件通り、検索は POST のみで表示
router.post('/search', async (req, res, next) => {
  const q = (req.body.q || '').trim();
  try {
    const posts = q
      ? await prisma.blog.findMany({
          where: {
            OR: [
              { title:   { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } }
            ]
          },
          orderBy: { postedAt: 'desc' },
        })
      : [];
    const viewPosts = posts.map(p => ({ ...p, dateStr: ymd(p.postedAt) }));
    res.render('index', {
      title: 'キーワード検索結果',
      posts: viewPosts,
      errors: [],
      form: { title: '', postedAt: ymd(new Date()), content: '' },
      searchMode: true,
      keyword: q
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
