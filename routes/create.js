// router/create.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function ymd(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

router.post('/', async (req, res, next) => {
  const { title, postedAt, content } = req.body;
  const errors = [];
  if (!title || !title.trim()) errors.push('タイトルは必須です。');
  if (!content || !content.trim()) errors.push('内容は必須です。');
  if (!postedAt || !/^\d{4}-\d{2}-\d{2}$/.test(postedAt)) errors.push('投稿日が不正です。');

  if (errors.length) {
    try {
      const posts = await prisma.blog.findMany({ orderBy: { postedAt: 'desc' } });
      const viewPosts = posts.map(p => ({ ...p, dateStr: ymd(p.postedAt) }));
      return res.status(400).render('index', {
        title: 'My Blog',
        posts: viewPosts,
        errors,
        form: { title, postedAt: postedAt || ymd(new Date()), content },
        searchMode: false,
        keyword: ''
      });
    } catch (e) { return next(e); }
  }

  try {
    await prisma.blog.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        postedAt: new Date(postedAt) // YYYY-MM-DD を Date に
      }
    });
    res.redirect('/');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
