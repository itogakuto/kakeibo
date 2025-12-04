const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ensureLoggedIn } = require('../middlewares/auth');

// 編集フォームの表示
router.get('/', ensureLoggedIn, async (req, res, next) => {
  const id = Number(req.query.id);
  const userId = req.session.userId;

  try {
    const record = await prisma.transaction.findFirst({
      where: { id, userId }
    });

    if (!record) return res.status(404).send('Not Found');

    res.render('edit', { record });
  } catch (e) {
    next(e);
  }
});

// 編集内容の反映
router.post('/', ensureLoggedIn, async (req, res, next) => {
  const id = Number(req.query.id);
  const userId = req.session.userId;
  const { title, amount, kind, date, memo } = req.body;

  try {
    await prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        title,
        amount: Number(amount),
        kind,
        date: new Date(date),
        memo: memo || null
      }
    });

    res.redirect('/');
  } catch (e) { next(e); }
});

module.exports = router;
