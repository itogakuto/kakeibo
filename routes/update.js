// router/update.js
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

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const blog = await prisma.blog.findUnique({ where: { id } });
    if (!blog) return res.status(404).send('Not Found');
    res.render('update', { blog: { ...blog, dateStr: ymd(blog.postedAt) }, errors: [] });
  } catch (e) { next(e); }
});

router.post('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const { title, postedAt, content } = req.body;
  const errors = [];
  if (!title || !title.trim()) errors.push('タイトルは必須です。');
  if (!content || !content.trim()) errors.push('内容は必須です。');
  if (!postedAt || !/^\d{4}-\d{2}-\d{2}$/.test(postedAt)) errors.push('投稿日が不正です。');

  if (errors.length) {
    return res.status(400).render('update', {
      blog: { id, title, content, dateStr: postedAt || '' },
      errors
    });
  }

  try {
    await prisma.blog.update({
      where: { id },
      data: { title: title.trim(), content: content.trim(), postedAt: new Date(postedAt) }
    });
    res.redirect('/');
  } catch (e) { next(e); }
});

module.exports = router;
