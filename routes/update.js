// routes/update.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ensureLoggedIn } = require('../middlewares/auth');

// 編集フォームの表示（GET）はそのまま
router.get('/', ensureLoggedIn, async (req, res, next) => {
  const id = Number(req.query.id);
  const userId = req.session.userId;

  try {
    const record = await prisma.transaction.findFirst({
      where: { id, userId }
    });

    if (!record) {
      return res.status(404).render('error', {
        message: '指定されたデータが見つかりませんでした。',
        error: null
      });
    }

    res.render('edit', { record });
  } catch (e) {
    next(e);
  }
});

// 更新処理（POST）
router.post('/', ensureLoggedIn, async (req, res, next) => {
  const { id, title, amount, kind, date, memo } = req.body;
  const userId = req.session.userId;

  const errors = [];

  const amountNum = Number(amount);
  if (!amount || Number.isNaN(amountNum) || amountNum < 0) {
    errors.push('金額は 0 以上の数値で入力してください。');
  }

  if (!['INCOME', 'EXPENSE'].includes(kind)) {
    errors.push('収支区分が不正です。');
  }

  const dateObj = new Date(date);
  if (!date || Number.isNaN(dateObj.getTime())) {
    errors.push('日付を正しく入力してください。');
  }

  if (!title || !title.trim()) {
    errors.push('項目名を入力してください。');
  }

  const numericId = Number(id);

  try {
    if (errors.length) {
      // 入力値でフォームを再表示（DB から取ってもOK）
      const record = {
        id: numericId,
        title: title || '',
        amount: Number.isNaN(amountNum) ? 0 : amountNum,
        kind,
        date: Number.isNaN(dateObj.getTime()) ? new Date() : dateObj,
        memo: memo || ''
      };

      return res.status(400).render('edit', { record, errors });
    }

    await prisma.transaction.updateMany({
      where: { id: numericId, userId },
      data: {
        title: title.trim(),
        amount: amountNum,
        kind,
        date: dateObj,
        memo: memo || null
      }
    });

    res.redirect('/');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
