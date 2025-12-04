// routes/index.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { ensureLoggedIn } = require('../middlewares/auth'); // ログインチェック

// グラフ用データを作る（最低限）
function buildChartData(records) {
  // 1. まず日付ごとにその日の収入 / 支出合計を出す
  const daily = {}; // { 'YYYY-MM-DD': { income, expense } }

  records.forEach(r => {
    const d = r.date.toISOString().slice(0, 10); // YYYY-MM-DD

    if (!daily[d]) {
      daily[d] = { income: 0, expense: 0 };
    }

    if (r.kind === 'INCOME') {
      daily[d].income += r.amount;
    } else if (r.kind === 'EXPENSE') {
      daily[d].expense += r.amount;
    }
  });

  // 2. 日付を古い順に並べる
  const dates = Object.keys(daily).sort();

  // 3. 累積を計算して配列にしていく
  const incomeCumulative = [];
  const expenseCumulative = [];
  const profitCumulative = [];

  let sumIncome = 0;
  let sumExpense = 0;

  dates.forEach(d => {
    sumIncome += daily[d].income;
    sumExpense += daily[d].expense;

    incomeCumulative.push(sumIncome);
    expenseCumulative.push(sumExpense);
    profitCumulative.push(sumIncome - sumExpense); // 残高 = 累積収入 - 累積支出
  });

  return {
    labels: dates,
    income: incomeCumulative,
    expense: expenseCumulative,
    profit: profitCumulative,
  };
}


// GET /login ログインフォーム
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST /login ログイン処理
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).render('login', { error: 'メールまたはパスワードが違います' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).render('login', { error: 'メールまたはパスワードが違います' });

    // セッションにユーザーID保存
    req.session.userId = user.id;
    res.redirect('/');
  } catch (e) { next(e); }
});

// GET /register 新規登録フォーム
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// POST /register 新規登録処理
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 先に同じメールが存在しないか確認
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).render('register', {
        error: 'このメールアドレスは既に登録されています'
      });
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, passwordHash: hash }
    });

    return res.redirect('/login');

  } catch (e) {
    throw e;
  }
});

// GET / ログイン後ダッシュボード
router.get('/', ensureLoggedIn, async (req, res, next) => {
  const userId = req.session.userId;
  const { kind = 'all', startDate, endDate } = req.query;

  try {
    // 共通の where 条件を作る
    const where = { userId };

    if (kind === 'income') where.kind = 'INCOME';
    if (kind === 'expense') where.kind = 'EXPENSE';

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate)   where.date.lte = new Date(endDate);
    }

    // ★ この records が「一覧＆グラフ」両方の元データ
    const records = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    // サマリー計算（フィルタ済みデータのみで）
    let totalIncome = 0;
    let totalExpense = 0;
    records.forEach(r => {
      if (r.kind === 'INCOME') totalIncome += r.amount;
      if (r.kind === 'EXPENSE') totalExpense += r.amount;
    });
    const balance = totalIncome - totalExpense;

    // グラフ用データも同じ records から作る
    const chartData = buildChartData(records);

    res.render('index', {
      records,
      summary: { totalIncome, totalExpense, balance },
      filter: { kind, startDate, endDate },
      chartData,
    });
  } catch (e) {
    next(e);
  }
});


// GET /detail?id=123 詳細表示（メモ等）
router.get('/detail', ensureLoggedIn, async (req, res, next) => {
  const userId = req.session.userId;
  const id = Number(req.query.id);
  try {
    const record = await prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!record) return res.status(404).send('Not Found');

    res.render('detail', { record });
  } catch (e) { next(e); }
});

module.exports = router;
