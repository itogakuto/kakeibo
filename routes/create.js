// routes/create.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ensureLoggedIn } = require('../middlewares/auth');

// 収支の新規作成
router.post('/', ensureLoggedIn, async (req, res, next) => {
  const userId = req.session.userId;
  const { title, amount, kind, date, memo } = req.body;

  const errors = [];

  // 金額チェック（数値＆ 0 以上）
  const amountNum = Number(amount);
  if (!amount || Number.isNaN(amountNum)) {
    errors.push('金額は数値で入力してください');
  } else if (amountNum <= 0) {
    errors.push('金額は 1 以上を入力してください');
  }

  // 収支区分チェック
  const validKinds = ['INCOME', 'EXPENSE'];
  if (!kind || !validKinds.includes(kind)) {
    errors.push('収支区分が不正です');
  }

  // 日付チェック（あれば Date に変換できるか）
  let dateObj = new Date();
  if (date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      errors.push('日付の形式が不正です');
    } else {
      dateObj = d;
    }
  }

  if (errors.length) {
    // 今はひとまず 400 とテキスト返し
    // 将来的には index.ejs を再表示して errors / 入力値を埋め戻すとUXが良くなる
    return res.status(400).send(errors.join('\n'));
  }

  try {
    await prisma.transaction.create({
      data: {
        userId,
        title: title ? title.trim() : '',
        amount: amountNum,
        kind,
        date: dateObj,
        memo: memo && memo.trim() ? memo.trim() : null,
      },
    });

    // 作成後はダッシュボードへ
    res.redirect('/');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
