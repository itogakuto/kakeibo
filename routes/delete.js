const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ensureLoggedIn } = require('../middlewares/auth');

router.get('/', ensureLoggedIn, async (req, res, next) => {
  const id = Number(req.query.id);
  const userId = req.session.userId;

  try {
    // userId を where に入れることで「本人のデータだけ削除」になる
    await prisma.transaction.deleteMany({
      where: { id, userId }
    });

    return res.redirect('/');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
