// routes/create.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ensureLoggedIn } = require('../middlewares/auth');

// ← index.js と同じ形になるように、簡易版の buildChartData を定義
function buildChartData(records) {
  const daily = {};
  records.forEach(r => {
    const d = r.date.toISOString().slice(0, 10);
    if (!daily[d]) daily[d] = { income: 0, expense: 0 };
    if (r.kind === 'INCOME') daily[d].income += r.amount;
    if (r.kind === 'EXPENSE') daily[d].expense += r.amount;
  });

  const dates = Object.keys(daily).sort();
  const labels = [];
  const income = [];
  const expense = [];
  const balance = [];

  let running = 0;
  dates.forEach(d => {
    const inc = daily[d].income;
    const exp = daily[d].expense;
    running += inc - exp;
    labels.push(d);
    income.push(inc);
    expense.push(exp);
    balance.push(running);
  });

  return { labels, income, expense, balance };
}

// 収支の新規作成
router.post('/', ensureLoggedIn, async (req, res, next) => {
  const userId = req.session.userId;
  const { title, amount, kind, date, memo } = req.body;

  const errors = [];

  // 金額チェック（数値＆ 0 以上）
  const amountNum = Number(amount);
  if (!amount || Number.isNaN(amountNum) || amountNum < 0) {
    errors.push('金額は 0 以上の数値で入力してください。');
  }

  // 区分チェック
  if (!['INCOME', 'EXPENSE'].includes(kind)) {
    errors.push('収支区分が不正です。');
  }

  // 日付チェック
  const dateObj = new Date(date);
  if (!date || Number.isNaN(dateObj.getTime())) {
    errors.push('日付を正しく入力してください。');
  }

  // タイトル必須チェック
  if (!title || !title.trim()) {
    errors.push('項目名を入力してください。');
  }

  try {
    if (errors.length) {
      // 一覧・サマリー・グラフ用データを取得して index.ejs を再表示
      const records = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
      });

      let totalIncome = 0;
      let totalExpense = 0;
      records.forEach(r => {
        if (r.kind === 'INCOME') totalIncome += r.amount;
        if (r.kind === 'EXPENSE') totalExpense += r.amount;
      });

      const summary = {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense
      };

      const chartData = buildChartData(records);

      return res.status(400).render('index', {
        records,
        summary,
        filter: { kind: 'all', startDate: '', endDate: '' },
        chartData,
        errors
      });
    }

    // 正常時はレコード作成
    await prisma.transaction.create({
      data: {
        userId,
        title: title.trim(),
        amount: amountNum,
        kind,
        date: dateObj,
        memo: memo && memo.trim() ? memo.trim() : null
      },
    });

    res.redirect('/');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
