/* ════════════════════════════════════════════════════════════
   EasyBank Interactive Prototype — app.js
   Mirrors all 12 slides from EasyBank_Interactive_Prototype.pptx
   ════════════════════════════════════════════════════════════ */

'use strict';

// ─── App State ────────────────────────────────────────────────
const state = {
  currentScreen: 'login',
  transfer: {
    type: null,
    from: 'Checking #4892',
    to: '',
    amount: '',
    date: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
    memo: '',
    recurring: false,
  },
  bill: { payee: '', amount: '', date: '' },
  loginAttempts: 0,
  sessionTimer: null,
  SESSION_TIMEOUT_MS: 10 * 60 * 1000,   // 10 minutes
  chatMessages: [
    { role: 'agent', text: 'Hi Hakan, how can I help you today?',       time: '9:02 AM' },
    { role: 'user',  text: 'I need help with a pending transfer.',      time: '9:03 AM' },
  ],
};

// ─── Accounts Data ────────────────────────────────────────────
const ACCOUNTS = [
  { name: 'Checking Account',  num: '#####4892', bal: '$12,450.00', type: 'Primary',  class: 'primary' },
  { name: 'Savings Account',   num: '#####7710', bal: '$8,230.50',  type: 'Savings',  class: '' },
  { name: 'Business Account',  num: '#####2201', bal: '$45,100.00', type: 'Business', class: '' },
];

const TRANSACTIONS = [
  { date:'Jun 15', desc:'Netflix Subscription',    type:'Debit',    cat:'Entertainment', amount:'-$15.99',    status:'Cleared'  },
  { date:'Jun 14', desc:'Direct Deposit – Salary', type:'Credit',   cat:'Income',        amount:'+$2,400.00', status:'Cleared'  },
  { date:'Jun 13', desc:'Grocery Store',           type:'Debit',    cat:'Food',          amount:'-$87.23',    status:'Cleared'  },
  { date:'Jun 12', desc:'City Electric – Bill Pay',type:'Bill Pay', cat:'Utilities',     amount:'-$89.00',    status:'Pending'  },
  { date:'Jun 10', desc:'ATM Withdrawal',          type:'Debit',    cat:'Cash',          amount:'-$200.00',   status:'Cleared'  },
  { date:'Jun 09', desc:'Amazon Purchase',         type:'Debit',    cat:'Shopping',      amount:'-$54.32',    status:'Cleared'  },
  { date:'Jun 07', desc:'Water Department',        type:'Bill Pay', cat:'Utilities',     amount:'-$32.50',    status:'Cleared'  },
  { date:'Jun 05', desc:'Freelance Payment',       type:'Credit',   cat:'Income',        amount:'+$1,200.00', status:'Cleared'  },
];

const PAYEES = [
  { name:'City Electric Co.', acct:'#4421', due:'Jun 20', amount:'$89.00',  status:'Due Soon'  },
  { name:'Internet Provider', acct:'#9983', due:'Jun 22', amount:'$54.99',  status:'Scheduled' },
  { name:'Water Department',  acct:'#1102', due:'Jun 25', amount:'$32.50',  status:'Pending'   },
  { name:'City Gas Company',  acct:'#7754', due:'Jul 01', amount:'$41.75',  status:'Upcoming'  },
];

// ─── Nav Config ───────────────────────────────────────────────
const NAV_SCREENS = [
  { label: 'Dashboard', screen: 'dashboard' },
  { label: 'Transfer',  screen: 'transfer-type' },
  { label: 'Bill Pay',  screen: 'bill-pay' },
  { label: 'Accounts',  screen: 'accounts' },
  { label: 'Support',   screen: 'support' },
];

// ─── DOM Helpers ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = $(`screen-${name}`);
  if (target) {
    target.classList.add('active');
    state.currentScreen = name;
    window.scrollTo(0, 0);
  }
  updateNav(name);
  resetSessionTimer();
}

function updateNav(screen) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.screen === screen ||
      (screen.startsWith('transfer') && item.dataset.screen === 'transfer-type') ||
      (screen === 'bill-success' && item.dataset.screen === 'bill-pay'));
  });
  // Show/hide navbar (hide on login screens)
  const hideNav = ['login', 'login-error', 'session-expired'].includes(screen);
  document.getElementById('main-navbar').style.display = hideNav ? 'none' : '';
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Session Timer ────────────────────────────────────────────
function resetSessionTimer() {
  clearTimeout(state.sessionTimer);
  const nonSession = ['login', 'login-error'];
  if (nonSession.includes(state.currentScreen)) return;
  state.sessionTimer = setTimeout(() => {
    $('modal-overlay').classList.add('active');
  }, state.SESSION_TIMEOUT_MS);
}

['click', 'keydown', 'mousemove', 'scroll'].forEach(ev =>
  document.addEventListener(ev, resetSessionTimer, { passive: true })
);

// ─── NAVBAR BUILD ─────────────────────────────────────────────
function buildNavbar() {
  const nav = $('main-navbar');
  nav.innerHTML = '';

  const logo = el('a', 'nav-logo', 'EasyBank');
  logo.addEventListener('click', () => showScreen('dashboard'));
  nav.appendChild(logo);

  const items = el('div', 'nav-items');
  NAV_SCREENS.forEach(({ label, screen }) => {
    const item = el('div', 'nav-item', label);
    item.dataset.screen = screen;
    item.addEventListener('click', () => showScreen(screen));
    items.appendChild(item);
  });
  nav.appendChild(items);

  const user = el('div', 'nav-user');
  user.innerHTML = `<span>Hakan Atilgan</span><span class="nav-divider">|</span><span class="logout-btn">Logout</span>`;
  user.querySelector('.logout-btn').addEventListener('click', () => {
    clearTimeout(state.sessionTimer);
    showScreen('login');
  });
  nav.appendChild(user);
}

// ════════════════════════════════════════════════════════════
// SCREEN RENDERERS
// ════════════════════════════════════════════════════════════

// ─── LOGIN ────────────────────────────────────────────────────
function initLogin() {
  $('login-submit').addEventListener('click', handleLogin);
  $('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  $('login-username').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
}

function handleLogin() {
  const user = $('login-username').value.trim();
  const pass = $('login-password').value;
  if (user === '' || pass === '') {
    showLoginError('Please enter your username and password.');
    return;
  }
  if (pass === 'wrong' || (pass.length > 0 && pass !== 'demo' && pass !== 'password' && pass !== '1234')) {
    state.loginAttempts++;
    const remaining = Math.max(0, 3 - state.loginAttempts);
    if (remaining === 0) {
      showLoginError('Account locked. Too many failed attempts. Please contact support.');
    } else {
      showLoginError(`Incorrect username or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
    }
    return;
  }
  // Success
  state.loginAttempts = 0;
  clearLoginError();
  showScreen('dashboard');
  renderDashboard();
}

function showLoginError(msg) {
  let err = $('login-error-banner');
  if (!err) {
    err = el('div', 'alert alert-error mb-12');
    err.id = 'login-error-banner';
    const body = $('login-body');
    body.insertBefore(err, body.children[1]);
  }
  err.innerHTML = `<span class="alert-icon">⚠️</span>${msg}`;
  err.classList.remove('hidden');
}

function clearLoginError() {
  const err = $('login-error-banner');
  if (err) err.classList.add('hidden');
}

// ─── DASHBOARD ────────────────────────────────────────────────
function renderDashboard() {
  // Quick actions
  const qaGrid = $('qa-grid');
  qaGrid.innerHTML = '';
  const qas = [
    { icon: '💸', label: 'Transfer\nFunds',  bg: '#D6E4F0', screen: 'transfer-type' },
    { icon: '📄', label: 'Pay\nBills',        bg: '#D4EDDA', screen: 'bill-pay' },
    { icon: '📊', label: 'View\nHistory',     bg: '#FFF3CD', screen: 'accounts' },
    { icon: '💬', label: 'Support\nChat',     bg: '#F8D7DA', screen: 'support' },
  ];
  qas.forEach(({ icon, label, bg, screen }) => {
    const card = el('div', 'qa-card');
    card.style.background = bg;
    card.innerHTML = `<div class="qa-card-icon">${icon}</div>${label.replace('\n','<br>')}`;
    card.addEventListener('click', () => showScreen(screen));
    qaGrid.appendChild(card);
  });

  // Recent transactions (4 rows)
  renderTransactionTable('dash-tx-body', TRANSACTIONS.slice(0, 4), false);
  $('dash-view-all').addEventListener('click', () => showScreen('accounts'));
}

function renderTransactionTable(tbodyId, rows, showType) {
  const tbody = $(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach(tx => {
    const tr = document.createElement('tr');
    const amtClass = tx.amount.startsWith('+') ? 'amount-credit' : 'amount-debit';
    const badge = badgeHTML(tx.status);
    tr.innerHTML = `
      <td>${tx.date}</td>
      <td>${tx.desc}</td>
      ${showType ? `<td>${tx.type}</td><td>${tx.cat}</td>` : ''}
      <td class="${amtClass}">${tx.amount}</td>
      <td>${badge}</td>`;
    tbody.appendChild(tr);
  });
}

function badgeHTML(status) {
  const map = { Cleared:'success', Pending:'pending', Scheduled:'info' };
  return `<span class="badge badge-${map[status] || 'info'}">${status}</span>`;
}

// ─── TRANSFER — STEP 1: Type ──────────────────────────────────
function initTransferType() {
  document.querySelectorAll('.transfer-type-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.transfer-type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.transfer.type = card.dataset.type;
      setTimeout(() => {
        showScreen('transfer-details');
        renderTransferDetails();
      }, 250);
    });
  });
  $('btn-back-dashboard').addEventListener('click', () => showScreen('dashboard'));
}

// ─── TRANSFER — STEP 2: Details ───────────────────────────────
function renderTransferDetails() {
  // Pre-fill date
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  $('tx-date').value = dateStr;
  state.transfer.date = dateStr;
  updateSummary();
}

function initTransferDetails() {
  $('tx-to').addEventListener('input',   () => { state.transfer.to     = $('tx-to').value;     updateSummary(); });
  $('tx-amount').addEventListener('input',() => { state.transfer.amount = $('tx-amount').value; updateSummary(); checkLimit(); });
  $('tx-date').addEventListener('change', () => { state.transfer.date   = $('tx-date').value;   updateSummary(); });
  $('tx-memo').addEventListener('input',  () => { state.transfer.memo   = $('tx-memo').value;   updateSummary(); });
  $('tx-recurring').addEventListener('change', () => { state.transfer.recurring = $('tx-recurring').checked; });

  $('btn-continue-confirm').addEventListener('click', () => {
    const err = validateTransferDetails();
    if (err) { showTransferError(err); return; }
    clearTransferError();
    showScreen('transfer-confirm');
    renderTransferConfirm();
  });
  $('btn-cancel-transfer').addEventListener('click', () => showScreen('dashboard'));
}

function updateSummary() {
  $('sum-from').textContent   = state.transfer.from;
  $('sum-to').textContent     = state.transfer.to    || '—';
  $('sum-amount').textContent = state.transfer.amount ? `$${parseFloat(state.transfer.amount || 0).toFixed(2)}` : '$0.00';
  $('sum-date').textContent   = state.transfer.date  || '—';
  $('sum-memo').textContent   = state.transfer.memo  || '—';
}

function checkLimit() {
  const amt = parseFloat(state.transfer.amount || 0);
  const limitBanner = $('tx-limit-banner');
  if (amt > 5000) {
    limitBanner.classList.remove('hidden');
    limitBanner.innerHTML = `<span class="alert-icon">⚠️</span>Amount exceeds your daily limit of $5,000. <a href="#" id="link-edge-limit" style="color:inherit;font-weight:700;">View limit error screen →</a>`;
    $('link-edge-limit').addEventListener('click', e => { e.preventDefault(); showScreen('edge-cases'); });
  } else {
    limitBanner.classList.add('hidden');
  }
}

function validateTransferDetails() {
  const to  = $('tx-to').value.trim();
  const amt = parseFloat($('tx-amount').value || 0);
  if (!to)       return 'Please enter a recipient account or select a payee.';
  if (!amt || amt <= 0) return 'Please enter a valid transfer amount.';
  if (amt > 5000) return `Amount exceeds your daily transfer limit of $5,000. Please enter $5,000 or less.`;
  if (amt > 12450) return `Insufficient funds. Your available balance is $12,450.00.`;
  return null;
}

function showTransferError(msg) {
  const banner = $('tx-error-banner');
  banner.innerHTML = `<span class="alert-icon">⚠️</span>${msg}`;
  banner.classList.remove('hidden');
}
function clearTransferError() {
  $('tx-error-banner').classList.add('hidden');
}

// ─── TRANSFER — STEP 3: Confirm ───────────────────────────────
function renderTransferConfirm() {
  const amt = parseFloat(state.transfer.amount || 0).toFixed(2);
  const ref = `TXN-${Date.now().toString().slice(-10)}`;
  state.transfer.ref = ref;
  const items = [
    { label:'From Account',  val: state.transfer.from },
    { label:'To Account',    val: state.transfer.to   },
    { label:'Amount',        val: `$${amt}`           },
    { label:'Transfer Date', val: state.transfer.date },
    { label:'Memo',          val: state.transfer.memo || '—' },
    { label:'Reference #',   val: ref },
  ];
  const grid = $('confirm-details-grid');
  grid.innerHTML = '';
  items.forEach(({ label, val }) => {
    const div = el('div', 'confirm-item');
    div.innerHTML = `<div class="confirm-label">${label}</div><div class="confirm-val">${val}</div>`;
    grid.appendChild(div);
  });
}

function initTransferConfirm() {
  $('btn-confirm-transfer').addEventListener('click', () => {
    showScreen('transfer-success');
    renderTransferSuccess();
  });
  $('btn-edit-details').addEventListener('click', () => showScreen('transfer-details'));
}

// ─── TRANSFER — STEP 4: Success ───────────────────────────────
function renderTransferSuccess() {
  const amt = parseFloat(state.transfer.amount || 0).toFixed(2);
  $('success-tx-amount').textContent = `$${amt} transferred to ${state.transfer.to}`;
  $('success-tx-ref').textContent    = `Reference: ${state.transfer.ref}   |   ${state.transfer.date}`;
}

function initTransferSuccess() {
  $('btn-back-dash-success').addEventListener('click', () => { showScreen('dashboard'); resetTransfer(); });
  $('btn-another-transfer').addEventListener('click', () => { resetTransfer(); showScreen('transfer-type'); });
}

function resetTransfer() {
  state.transfer = { type:null, from:'Checking #4892', to:'', amount:'', date:'', memo:'', recurring:false };
  if ($('tx-to'))     $('tx-to').value     = '';
  if ($('tx-amount')) $('tx-amount').value = '';
  if ($('tx-memo'))   $('tx-memo').value   = '';
  document.querySelectorAll('.transfer-type-card').forEach(c => c.classList.remove('selected'));
}

// ─── BILL PAY ─────────────────────────────────────────────────
function renderBillPay() {
  const tbody = $('payee-tbody');
  tbody.innerHTML = '';
  PAYEES.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.name}</strong></td>
      <td>${p.acct}</td>
      <td>${p.due}</td>
      <td><strong>${p.amount}</strong></td>
      <td>${badgeHTML(p.status)}</td>
      <td><button class="btn btn-teal btn-sm pay-btn" data-payee="${p.name}" data-amount="${p.amount}">Pay Now</button></td>`;
    tr.querySelector('.pay-btn').addEventListener('click', function () {
      $('sched-payee').value  = this.dataset.payee;
      $('sched-amount').value = this.dataset.amount.replace('$','');
    });
    tbody.appendChild(tr);
  });

  // Populate payee select
  const sel = $('sched-payee');
  sel.innerHTML = '<option value="">Select payee...</option>';
  PAYEES.forEach(p => { const o = document.createElement('option'); o.value = p.name; o.textContent = p.name; sel.appendChild(o); });

  // Default date
  $('sched-date').value = new Date().toISOString().split('T')[0];
}

function initBillPay() {
  $('btn-schedule-bill').addEventListener('click', () => {
    const payee  = $('sched-payee').value;
    const amount = $('sched-amount').value;
    const date   = $('sched-date').value;
    if (!payee || !amount || !date) {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    state.bill = { payee, amount, date };
    showScreen('bill-success');
    renderBillSuccess();
  });
}

function renderBillSuccess() {
  const ref = `BILL-${Date.now().toString().slice(-10)}`;
  $('bill-success-amount').textContent = `$${parseFloat(state.bill.amount).toFixed(2)} to ${state.bill.payee}`;
  $('bill-success-ref').textContent    = `Scheduled for: ${state.bill.date}   |   Ref: ${ref}`;
  $('bill-success-from').textContent   = 'From: Checking #4892';
}

function initBillSuccess() {
  $('btn-back-dash-bill').addEventListener('click', () => showScreen('dashboard'));
  $('btn-schedule-another').addEventListener('click', () => { showScreen('bill-pay'); renderBillPay(); });
}

// ─── ACCOUNTS ─────────────────────────────────────────────────
function renderAccounts() {
  // Account cards
  const grid = $('account-cards-grid');
  grid.innerHTML = '';
  ACCOUNTS.forEach((acct, i) => {
    const card = el('div', `account-card ${acct.class} ${i === 0 ? 'active' : ''}`);
    card.innerHTML = `
      <div class="acct-name">${acct.name}</div>
      <div class="acct-num">${acct.num}</div>
      <div class="acct-bal">${acct.bal}</div>
      <div class="acct-status">Available  |  ${acct.type}</div>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('.account-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      showToast(`Viewing ${acct.name}`);
    });
    grid.appendChild(card);
  });

  // Full transaction table
  renderTransactionTable('acct-tx-body', TRANSACTIONS, true);
}

function initAccounts() {
  $('btn-search-tx').addEventListener('click', () => {
    const q = $('tx-search').value.toLowerCase().trim();
    const filtered = TRANSACTIONS.filter(tx =>
      tx.desc.toLowerCase().includes(q) ||
      tx.amount.includes(q) ||
      tx.date.toLowerCase().includes(q) ||
      tx.cat.toLowerCase().includes(q)
    );
    renderTransactionTable('acct-tx-body', filtered, true);
    if (filtered.length === 0) {
      $('acct-tx-body').innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:20px">No transactions found for "${q}"</td></tr>`;
    }
  });
  $('tx-search').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-search-tx').click(); });

  // Download buttons
  document.querySelectorAll('.dl-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast(`Downloading ${btn.dataset.range} statement…`));
  });
}

// ─── SUPPORT ─────────────────────────────────────────────────
function initSupport() {
  $('btn-chat-send').addEventListener('click', sendChatMessage);
  $('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });
  $('btn-send-email').addEventListener('click', () => {
    const subj = $('email-subject').value.trim();
    const msg  = $('email-message').value.trim();
    if (!subj || !msg) { showToast('Please fill in both fields.', 'error'); return; }
    $('email-subject').value = '';
    $('email-message').value = '';
    showToast('Email sent. We\'ll reply within 2 business hours.', 'success');
  });
}

function sendChatMessage() {
  const input = $('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  const now = new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  state.chatMessages.push({ role: 'user', text, time: now });
  renderChatMessages();
  // Auto-reply
  setTimeout(() => {
    const replies = [
      'I can help with that. Could you provide your account number?',
      'Let me look into that for you. One moment, please.',
      'I see the issue. I\'ll escalate this to our transfers team right away.',
      'Your case has been logged. Reference #SUP-' + Math.floor(Math.random() * 90000 + 10000) + '.',
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    state.chatMessages.push({ role:'agent', text: reply, time: new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }) });
    renderChatMessages();
  }, 1200);
}

function renderChatMessages() {
  const container = $('chat-messages');
  container.innerHTML = '';
  state.chatMessages.forEach(msg => {
    const wrap = el('div', `chat-msg ${msg.role}`);
    wrap.innerHTML = `<div class="chat-bubble">${msg.text}</div><div class="chat-meta">${msg.role === 'agent' ? 'Support Agent' : 'You'}  •  ${msg.time}</div>`;
    container.appendChild(wrap);
  });
  container.scrollTop = container.scrollHeight;
}

// ─── EDGE CASES ───────────────────────────────────────────────
function initEdgeCases() {
  $('edge-try-again').addEventListener('click', () => {
    showScreen('transfer-details');
    $('tx-amount').value = '';
    $('tx-error-banner').classList.add('hidden');
    $('tx-limit-banner').classList.add('hidden');
  });
  $('edge-login-again').addEventListener('click', () => { $('modal-overlay').classList.remove('active'); showScreen('login'); });
  $('edge-edit-amount').addEventListener('click', () => showScreen('transfer-details'));
  $('edge-ret-dashboard').addEventListener('click', () => showScreen('dashboard'));
  $('edge-ret-transfer').addEventListener('click',  () => showScreen('transfer-details'));
  $('edge-ret-login').addEventListener('click',     () => showScreen('login'));
}

// ─── MODAL (session timeout) ──────────────────────────────────
function initModal() {
  $('modal-login-btn').addEventListener('click', () => {
    $('modal-overlay').classList.remove('active');
    showScreen('login');
  });
  $('modal-stay-btn').addEventListener('click', () => {
    $('modal-overlay').classList.remove('active');
    resetSessionTimer();
    showToast('Session extended.', 'success');
  });
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildNavbar();

  // Render screens with dynamic content
  renderDashboard();

  // Wire up all screen logic
  initLogin();
  initTransferType();
  initTransferDetails();
  initTransferConfirm();
  initTransferSuccess();
  initBillPay();
  initBillSuccess();
  initAccounts();
  initSupport();
  initEdgeCases();
  initModal();

  // Initial render for screens that need data
  renderBillPay();
  renderAccounts();
  renderChatMessages();

  // Start on login
  showScreen('login');
});
