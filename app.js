const DENOMS = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

const NOTE_IMAGES = {
  500000: 'https://upload.wikimedia.org/wikipedia/vi/9/9f/500000_polymer.jpg',
  200000: 'https://upload.wikimedia.org/wikipedia/vi/0/04/Gi%E1%BA%A5y_b%E1%BA%A1c_200.000.jpg',
  100000: 'https://upload.wikimedia.org/wikipedia/vi/a/a9/100nghins.jpg',
  50000: 'https://upload.wikimedia.org/wikipedia/vi/2/28/%C4%90%E1%BB%93ng_b%E1%BA%A1c_50.000.jpg',
  20000: 'hhttps://upload.wikimedia.org/wikipedia/vi/f/f2/%C4%90%E1%BB%93ng_b%E1%BA%A1c_20.000.jpg',
  10000: 'https://upload.wikimedia.org/wikipedia/vi/3/32/%C4%90%E1%BB%93ng_b%E1%BA%A1c_10.000_%C4%91%E1%BB%93ng.jpg',
  5000: 'https://upload.wikimedia.org/wikipedia/vi/7/7c/%C4%90%E1%BB%93ng_b%E1%BA%A1c_5000_%C4%91%E1%BB%93ng.jpg',
  2000: 'https://upload.wikimedia.org/wikipedia/vi/1/14/Gi%E1%BA%A5y_b%E1%BA%A1c_2000_%C4%91%E1%BB%93ng.jpg',
  1000: 'https://upload.wikimedia.org/wikipedia/vi/9/9f/%C4%90%E1%BB%93ng_b%E1%BA%A1c_1000_%C4%91%E1%BB%93ng.jpeg'
};

const counts = {};
const paymentCounts = {};
let suggestion = null;

const cashGrid = document.getElementById('cash-grid');
const paymentGrid = document.getElementById('payment-grid');
const totalText = document.getElementById('total-text');
const billInput = document.getElementById('bill-amount');
const applyBtn = document.getElementById('apply-btn');
const changeBox = document.getElementById('change-box');
const changeVal = document.getElementById('change-val');
const changeLabels = document.getElementById('change-labels');

function formatMoney(value) {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function formatShort(denom) {
  if (denom >= 1000) return `${denom / 1000}k`;
  return `${denom}`;
}

function createDenomCard(denom, onInput, inputIdPrefix = 'in') {
  const card = document.createElement('article');
  card.className = 'denom-card';
  card.innerHTML = `
    <img class="denom-img" src="${NOTE_IMAGES[denom]}" alt="Tờ ${denom.toLocaleString('vi-VN')} đồng" loading="lazy" referrerpolicy="no-referrer" />
    <p class="denom-title">${formatMoney(denom)} (${formatShort(denom)})</p>
    <input
      id="${inputIdPrefix}-${denom}"
      class="denom-input"
      type="number"
      min="0"
      step="1"
      placeholder="0"
    />
  `;

  const input = card.querySelector('input');
  input.addEventListener('input', (event) => onInput(denom, event.target.value));
  return card;
}

function renderGrids() {
  DENOMS.forEach((denom) => {
    counts[denom] = 0;
    paymentCounts[denom] = 0;
    cashGrid.appendChild(createDenomCard(denom, updateCashCount, 'cash'));
    paymentGrid.appendChild(createDenomCard(denom, updatePaymentCount, 'pay'));
  });
}

function updateCashCount(denom, value) {
  counts[denom] = Math.max(0, Number.parseInt(value, 10) || 0);
  calcTotal();
  calculateTransaction();
}

function updatePaymentCount(denom, value) {
  paymentCounts[denom] = Math.max(0, Number.parseInt(value, 10) || 0);
  calculateTransaction();
}

function calcTotal() {
  const total = DENOMS.reduce((sum, denom) => sum + denom * counts[denom], 0);
  totalText.textContent = formatMoney(total);
}

function calculateTransaction() {
  const bill = Math.max(0, Number.parseInt(billInput.value, 10) || 0);
  const paid = DENOMS.reduce((sum, denom) => sum + denom * paymentCounts[denom], 0);

  if (bill <= 0 || paid < bill) {
    suggestion = null;
    changeBox.classList.add('hidden');
    applyBtn.disabled = true;
    return;
  }

  let changeNeed = paid - bill;
  const removed = {};

  DENOMS.forEach((denom) => {
    if (changeNeed <= 0) return;
    const available = counts[denom] + paymentCounts[denom];
    const take = Math.min(Math.floor(changeNeed / denom), available);
    if (take > 0) {
      removed[denom] = take;
      changeNeed -= denom * take;
    }
  });

  if (changeNeed !== 0) {
    suggestion = null;
    changeBox.classList.remove('hidden');
    changeVal.textContent = 'Không đủ mệnh giá để thối';
    changeLabels.innerHTML = '<span class="change-pill">Cần bổ sung mệnh giá nhỏ hơn</span>';
    applyBtn.disabled = true;
    return;
  }

  suggestion = {
    bill,
    paid,
    added: { ...paymentCounts },
    removed
  };

  changeBox.classList.remove('hidden');
  changeVal.textContent = formatMoney(paid - bill);
  changeLabels.innerHTML = '';

  Object.entries(removed).forEach(([denom, qty]) => {
    const tag = document.createElement('span');
    tag.className = 'change-pill';
    tag.textContent = `${formatShort(Number(denom))} x ${qty}`;
    changeLabels.appendChild(tag);
  });

  if (!Object.keys(removed).length) {
    const tag = document.createElement('span');
    tag.className = 'change-pill';
    tag.textContent = 'Khách đưa đúng tiền';
    changeLabels.appendChild(tag);
  }

  applyBtn.disabled = false;
}

function applyTransaction() {
  if (!suggestion) return;

  DENOMS.forEach((denom) => {
    counts[denom] += suggestion.added[denom] || 0;
  });

  Object.entries(suggestion.removed).forEach(([denom, qty]) => {
    counts[denom] = Math.max(0, counts[denom] - qty);
  });

  DENOMS.forEach((denom) => {
    document.getElementById(`cash-${denom}`).value = counts[denom] || '';
    paymentCounts[denom] = 0;
    document.getElementById(`pay-${denom}`).value = '';
  });

  billInput.value = '';
  suggestion = null;
  changeBox.classList.add('hidden');
  applyBtn.disabled = true;
  calcTotal();
}

function clearTransactionFields() {
  billInput.value = '';
  suggestion = null;
  DENOMS.forEach((denom) => {
    paymentCounts[denom] = 0;
    document.getElementById(`pay-${denom}`).value = '';
  });
  changeBox.classList.add('hidden');
  applyBtn.disabled = true;
}

function resetAll() {
  if (!window.confirm('Xóa toàn bộ dữ liệu để đếm lại từ đầu?')) return;

  DENOMS.forEach((denom) => {
    counts[denom] = 0;
    paymentCounts[denom] = 0;
    document.getElementById(`cash-${denom}`).value = '';
    document.getElementById(`pay-${denom}`).value = '';
  });

  billInput.value = '';
  suggestion = null;
  changeBox.classList.add('hidden');
  applyBtn.disabled = true;
  calcTotal();
}

async function copyReport() {
  const rows = DENOMS
    .filter((denom) => counts[denom] > 0)
    .map((denom) => `• ${formatMoney(denom)}: ${counts[denom]} tờ`)
    .join('\n');

  const text = `BÁO CÁO KÉT TIỀN\n${rows || '• Chưa nhập dữ liệu'}\nTỔNG: ${totalText.textContent}`;

  try {
    await navigator.clipboard.writeText(text);
    window.alert('Đã sao chép báo cáo.');
  } catch (error) {
    window.alert('Không thể sao chép tự động. Hãy thử lại trên trình duyệt khác.');
  }
}

function init() {
  renderGrids();
  calcTotal();

  document.getElementById('reset-btn').addEventListener('click', resetAll);
  document.getElementById('close-transaction-btn').addEventListener('click', clearTransactionFields);
  document.getElementById('copy-btn').addEventListener('click', copyReport);
  applyBtn.addEventListener('click', applyTransaction);
  billInput.addEventListener('input', calculateTransaction);
}

window.addEventListener('DOMContentLoaded', init);
