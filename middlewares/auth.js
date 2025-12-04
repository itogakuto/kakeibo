// middlewares/auth.js

function ensureLoggedIn(req, res, next) {
  // セッションに userId がなければ未ログイン扱い
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

module.exports = { ensureLoggedIn };