const $ = (selector) => document.querySelector(selector);
const state = { token: localStorage.getItem('bvzy-token'), account: null, transactions: [], showBalance: true, recipient: null };
const money = (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(Number(value) || 0);
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'BV';
const safe = (text = '') => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const fmtDate = (value) => new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Something went wrong. Please try again.');
  return data;
}
function setMessage(id, message = '', success = false) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('success', success);
}
function toast(message) {
  const node = $('#toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2800);
}
function showAuth(view = 'login') {
  $('#auth-view').classList.remove('hidden'); $('#app-view').classList.add('hidden');
  const signup = view === 'signup';
  $('#login-panel').classList.toggle('hidden', signup); $('#signup-panel').classList.toggle('hidden', !signup);
  $('#auth-switch-copy').innerHTML = signup ? 'Already with BVZYPAY? <button class="text-button" data-view="login">Sign in</button>' : 'New to BVZYPAY? <button class="text-button" data-view="signup">Create account</button>';
}
function showApp() { $('#auth-view').classList.add('hidden'); $('#app-view').classList.remove('hidden'); }
function renderTransactions(target, list, emptyTarget, limit = Infinity) {
  const container = document.getElementById(target);
  const entries = list.slice(0, limit);
  container.innerHTML = entries.map(tx => {
    const debit = tx.type === 'debit';
    const description = tx.description || (debit ? 'Payment sent' : 'Money received');
    const title = debit ? 'Money sent' : 'Money received';
    return `<div class="transaction-row"><div class="tx-name"><span class="tx-icon ${debit ? 'debit' : ''}">${debit ? '↗' : '↙'}</span><div><strong>${safe(title)}</strong><small>${safe(description)}</small></div></div><span class="tx-date">${fmtDate(tx.createdAt)}</span><span class="status-pill">${safe(tx.status || 'successful')}</span><span class="tx-amount ${debit ? 'debit' : ''}">${debit ? '−' : '+'}${money(tx.amount)}</span></div>`;
  }).join('');
  const empty = document.getElementById(emptyTarget);
  if (empty) empty.classList.toggle('hidden', entries.length > 0);
  container.classList.toggle('hidden', entries.length === 0);
}
function paint() {
  const account = state.account;
  if (!account) return;
  const user = account.user || {};
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'BVZYPAY member';
  $('#profile-name').textContent = fullName;
  $('#profile-initials').textContent = initials(fullName);
  $('#account-number').textContent = account.accountNumber || '•••• •••• ••••';
  $('#balance-value').textContent = state.showBalance ? money(account.balance) : '₦ ••••••';
  $('#balance-toggle').textContent = state.showBalance ? '◉' : '◎';
  $('#balance-toggle').setAttribute('aria-label', state.showBalance ? 'Hide balance' : 'Show balance');
  $('#transfer-balance').textContent = money(account.balance);
  $('#balance-updated').textContent = `Updated ${new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
  $('#today-date').textContent = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  $('#activity-count').textContent = `${state.transactions.length} ${state.transactions.length === 1 ? 'transaction' : 'transactions'}`;
  renderTransactions('recent-transactions', state.transactions, 'empty-transactions', 5);
  renderTransactions('all-transactions', state.transactions, 'all-empty');
}
async function loadDashboard() {
  try {
    const data = await api('/accounts/me');
    state.account = data.account;
    const result = await api(`/accounts/${state.account._id}/transactions`);
    state.transactions = result.transactions || [];
    showApp(); paint();
  } catch (error) {
    if (/not authorized|token|login/i.test(error.message) || error.message === 'Account not found') {
      state.token = null; localStorage.removeItem('bvzy-token'); showAuth();
      if (error.message !== 'Account not found') setMessage('login-message', 'Your session ended. Please sign in again.');
    } else {
      showApp();
      toast(error.message || 'Could not load your account.');
    }
  }
}
function navigate(page) {
  const valid = ['overview', 'transactions', 'transfer'].includes(page) ? page : 'overview';
  document.querySelectorAll('.page').forEach(node => node.classList.toggle('active', node.id === `page-${valid}`));
  document.querySelectorAll('.nav-item').forEach(node => node.classList.toggle('active', node.dataset.page === valid));
  $('#page-title').textContent = { overview: 'Overview', transactions: 'Transactions', transfer: 'Send money' }[valid];
  if (valid === 'transfer') $('#recipient-account').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) showAuth(viewButton.dataset.view);
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) navigate(pageButton.dataset.page);
});
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); setMessage('login-message', 'Signing you in…');
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const result = await api('/login', { method: 'POST', body: JSON.stringify(values) });
    state.token = result.token; localStorage.setItem('bvzy-token', state.token);
    setMessage('login-message', ''); await loadDashboard();
  } catch (error) { setMessage('login-message', error.message); }
});
$('#signup-form').addEventListener('submit', async event => {
  event.preventDefault(); setMessage('signup-message', 'Creating your account…');
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api('/createAccount', { method: 'POST', body: JSON.stringify(values) });
    const login = await api('/login', { method: 'POST', body: JSON.stringify({ email: values.email, password: values.password }) });
    state.token = login.token; localStorage.setItem('bvzy-token', state.token); setMessage('signup-message', 'Account ready. Signing you in…', true); await loadDashboard();
  } catch (error) { setMessage('signup-message', error.message); }
});
$('#logout-button').addEventListener('click', () => {
  state.token = null; state.account = null; state.transactions = []; localStorage.removeItem('bvzy-token');
  $('#login-form').reset(); setMessage('login-message', ''); showAuth();
});
$('#refresh-button').addEventListener('click', async () => { $('#refresh-button').textContent = '…'; await loadDashboard(); $('#refresh-button').textContent = '↻'; });
$('#balance-toggle').addEventListener('click', () => { state.showBalance = !state.showBalance; paint(); });
$('#copy-account').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(state.account.accountNumber); toast('Account number copied'); }
  catch { toast(`Account number: ${state.account.accountNumber}`); }
});
$('#help-button').addEventListener('click', () => toast('Support contact details will be available soon.'));
async function lookupRecipient() {
  const number = $('#recipient-account').value.trim();
  const result = $('#recipient-result'); state.recipient = null;
  if (!/^\d{10}$/.test(number)) { result.textContent = 'Enter a valid 10-digit BVZYPAY account number.'; result.classList.remove('hidden'); result.style.background = '#fff2ed'; result.style.color = '#a94c37'; return false; }
  result.textContent = 'Checking account…'; result.classList.remove('hidden'); result.style.background = ''; result.style.color = '';
  try {
    const data = await api(`/accounts/name/${encodeURIComponent(number)}`);
    state.recipient = { accountNumber: number, name: data.name };
    result.innerHTML = `<strong>✓ ${safe(data.name)}</strong> · BVZYPAY account`;
    result.style.background = ''; result.style.color = ''; return true;
  } catch (error) {
    result.textContent = error.message; result.style.background = '#fff2ed'; result.style.color = '#a94c37'; return false;
  }
}
$('#lookup-button').addEventListener('click', lookupRecipient);
$('#recipient-account').addEventListener('input', () => { state.recipient = null; $('#recipient-result').classList.add('hidden'); });
$('#transfer-form').addEventListener('submit', async event => {
  event.preventDefault(); setMessage('transfer-message', '');
  if (!state.recipient || state.recipient.accountNumber !== $('#recipient-account').value.trim()) {
    if (!await lookupRecipient()) return;
  }
  const form = new FormData(event.currentTarget);
  const amount = Number(form.get('amount'));
  if (!Number.isFinite(amount) || amount <= 0) return setMessage('transfer-message', 'Enter an amount greater than zero.');
  if (amount > Number(state.account.balance)) return setMessage('transfer-message', 'This amount is more than your available balance.');
  $('#confirm-amount').textContent = money(amount);
  $('#confirm-name').textContent = state.recipient.name;
  $('#confirm-account').textContent = state.recipient.accountNumber;
  $('#confirm-note').textContent = form.get('note') || '—';
  $('#confirm-modal').classList.remove('hidden');
});
$('#close-modal').addEventListener('click', () => $('#confirm-modal').classList.add('hidden'));
$('#confirm-modal').addEventListener('click', event => { if (event.target.id === 'confirm-modal') $('#confirm-modal').classList.add('hidden'); });
$('#confirm-button').addEventListener('click', async () => {
  const button = $('#confirm-button'); button.disabled = true; button.innerHTML = 'Sending…';
  try {
    const form = new FormData($('#transfer-form'));
    await api('/accounts/transfer', { method: 'POST', body: JSON.stringify({ toAccountNumber: form.get('toAccountNumber'), amount: Number(form.get('amount')), note: form.get('note') }) });
    $('#confirm-modal').classList.add('hidden'); $('#transfer-form').reset(); $('#recipient-result').classList.add('hidden'); state.recipient = null;
    toast('Transfer sent successfully'); await loadDashboard(); navigate('overview');
  } catch (error) { $('#confirm-modal').classList.add('hidden'); setMessage('transfer-message', error.message); }
  finally { button.disabled = false; button.innerHTML = 'Confirm and send <span>↗</span>'; }
});

if (state.token) loadDashboard(); else showAuth();
