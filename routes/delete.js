// routes/delete.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ensureLoggedIn } = require('../middlewares/auth');

router.get('/', ensureLoggedIn, async (req, res, next) => {
  const id = Number(req.query.id);
  const userId = req.session.userId;

  if (!Number.isInteger(id)) {
    return res.status(400).render('error', {
      message: '不正なIDが指定されました。',
      error: null
    });
  }

  try {
    await prisma.transaction.deleteMany({
      where: { id, userId }
    });

    return res.redirect('/');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
