// router/delete.js
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
    res.render('delete', { blog: { ...blog, dateStr: ymd(blog.postedAt) } });
  } catch (e) { next(e); }
});

router.post('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.blog.delete({ where: { id } });
    res.redirect('/');
  } catch (e) { next(e); }
});

module.exports = router;
