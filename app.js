const DENOMS = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

const NOTE_IMAGES = {
   500000: 'https://en.numista.com/catalogue/photos/viet_nam/65ca1a3c37c767.33491922-original.jpg',
   200000: 'https://en.numista.com/catalogue/photos/viet_nam/5e9ceba72ab570.69167788-original.jpg',
   100000: 'https://en.numista.com/catalogue/photos/viet_nam/64f38ae1a90dc4.91546703-original.jpg',
   50000: 'https://en.numista.com/catalogue/photos/viet_nam/5e9e97d1456249.52677947-original.jpg',
   20000: 'https://en.numista.com/catalogue/photos/viet_nam/63fdf045478aa8.79782893-original.jpg',
   10000: 'https://en.numista.com/catalogue/photos/viet_nam/629a30e8e84ca4.62721942-original.jpg',
   5000: 'https://en.numista.com/catalogue/photos/viet_nam/626b8803cc0d90.08806464-original.jpg',
   2000: 'https://en.numista.com/catalogue/photos/viet_nam/626b87e6254884.34599868-original.jpg',
   1000: 'https://en.numista.com/catalogue/photos/viet_nam/626b8a28cd1456.57945404-original.jpg'
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


function docSoThanhChu(so) {
   if (so === 0) return "Không đồng";
   const units = ["", " nghìn", " triệu", " tỷ"];
   const readGroup = (n) => {
      const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
      let res = "";
      let h = Math.floor(n / 100);
      let t = Math.floor((n % 100) / 10);
      let d = n % 10;
      if (h > 0) res += digits[h] + " trăm ";
      if (t > 1) res += digits[t] + " mươi ";
      else if (t === 1) res += "mười ";
      else if (h > 0 && d > 0) res += "lẻ ";
      if (t !== 0 && d === 5) res += "lăm";
      else if (d !== 0) res += digits[d];
      return res;
   };

   let res = "";
   let i = 0;
   while (so > 0) {
      let group = so % 1000;
      if (group > 0) res = readGroup(group) + units[i] + " " + res;
      so = Math.floor(so / 1000);
      i++;
   }
   return res.trim().charAt(0).toUpperCase() + res.trim().slice(1) + " đồng";
}

let myChart = null;

function updateChart() {
   const ctx = document.getElementById('denomChart').getContext('2d');
   const dataValues = DENOMS.map(d => counts[d] * d);
   const dataCounts = DENOMS.map(d => counts[d] || 0);
   const total = dataValues.reduce((a, b) => a + b, 0);

   const smallCash = (counts[1000] * 1000) + (counts[2000] * 2000);
   const warning = document.getElementById('denom-warning');
   if (total > 0 && (smallCash / total) > 0.2) warning.classList.remove('hidden');
   else warning.classList.add('hidden');

   if (myChart) myChart.destroy();
   myChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
         labels: DENOMS.map(d => formatShort(d)),
         datasets: [{
            data: dataValues,
            backgroundColor: ['#4c8dff', '#38bdf8', '#818cf8', '#a78bfa', '#22c55e', '#fbbf24', '#f87171', '#94a3b8', '#64748b'],
            borderWidth: 0
         }]
      },
      options: {
         plugins: {
            legend: {
               display: false
            },
            tooltip: {
               enabled: true,
               callbacks: {
                  label: function (context) {
                     const index = context.dataIndex;
                     const value = formatMoney(context.dataset.data[index]);
                     const qty = dataCounts[index];
                     return ` Tổng: ${value} (${qty} tờ)`;
                  }
               }
            }
         },
         cutout: '70%'
      }
   });
}

const logs = JSON.parse(localStorage.getItem('transaction_logs') || '[]');

function addLog(bill, paid, change) {
   const entry = {
      time: new Date().toLocaleTimeString('vi-VN'),
      bill,
      change
   };
   logs.unshift(entry);
   if (logs.length > 20) logs.pop();
   localStorage.setItem('transaction_logs', JSON.stringify(logs));
   renderLogs();
}

function renderLogs() {
   const container = document.getElementById('transaction-logs');
   if (logs.length === 0) return;
   container.innerHTML = logs.map(l => `
    <div class="log-entry">
      <span>${l.time} - Bill: ${formatShort(l.bill)}</span>
      <span style="color: var(--primary)">Thối: ${formatShort(l.change)}</span>
    </div>
  `).join('');
}

function calcTotal() {
   const total = DENOMS.reduce((sum, denom) => sum + denom * (counts[denom] || 0), 0);
   totalText.textContent = formatMoney(total);
   document.getElementById('total-word').textContent = docSoThanhChu(total);
   updateChart();
}

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

const STORAGE_KEY = 'cash_counter_state';

function saveState() {
   const state = {
      counts,
      paymentCounts,
      billValue: billInput.value
   };
   localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
   const saved = localStorage.getItem(STORAGE_KEY);
   if (!saved) return;
   try {
      const state = JSON.parse(saved);
      Object.assign(counts, state.counts);
      Object.assign(paymentCounts, state.paymentCounts);

      DENOMS.forEach(denom => {
         const cashInp = document.getElementById(`cash-${denom}`);
         const payInp = document.getElementById(`pay-${denom}`);
         if (cashInp) cashInp.value = counts[denom] || '';
         if (payInp) payInp.value = paymentCounts[denom] || '';
      });

      if (state.billValue) billInput.value = state.billValue;
   } catch (e) {
      console.error("Lỗi khôi phục dữ liệu", e);
   }
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
      added: {
         ...paymentCounts
      },
      removed
   };

   changeBox.classList.remove('hidden');
   changeVal.textContent = formatMoney(paid - bill);
   changeLabels.innerHTML = '';

   Object.entries(removed).forEach(([denom, qty]) => {
      const item = document.createElement('div');
      item.className = 'change-item';
      item.innerHTML = `
      <img src="${NOTE_IMAGES[denom]}" class="change-img" alt="${denom}">
      <span class="change-qty">x${qty}</span>
    `;
      item.title = `${formatMoney(Number(denom))} x ${qty} tờ`;
      changeLabels.appendChild(item);
   });

   if (!Object.keys(removed).length && paid > bill) {
      changeLabels.innerHTML = '<span class="change-pill">Khách đưa đúng tiền</span>';
   }

   applyBtn.disabled = false;
}

const sideMenu = document.getElementById('side-menu');
const overlay = document.getElementById('menu-overlay');

document.getElementById('menu-btn').onclick = () => {
   sideMenu.classList.remove('hidden');
   overlay.classList.add('active');
};

const closeMenu = () => {
   sideMenu.classList.add('hidden');
   overlay.classList.remove('active');
};

document.getElementById('close-menu').onclick = closeMenu;
overlay.onclick = closeMenu;

function applyTransaction() {
   if (!suggestion) return;

   document.getElementById('success-sound').play();
   addLog(suggestion.bill, suggestion.paid, suggestion.paid - suggestion.bill);
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

const confirmModal = document.getElementById('confirm-modal');

function resetAll() {
   confirmModal.classList.add('active');
}

document.getElementById('cancel-reset').onclick = () => {
   confirmModal.classList.remove('active');
};

document.getElementById('confirm-reset').onclick = () => {
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

   localStorage.removeItem('transaction_logs');
   logs.length = 0;
   renderLogs();

   calcTotal();
   saveState();

   confirmModal.classList.remove('active');

   if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
};

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
   loadState();
   calcTotal();
   calculateTransaction();

   document.getElementById('reset-btn').addEventListener('click', resetAll);
   document.getElementById('close-transaction-btn').addEventListener('click', clearTransactionFields);
   document.getElementById('copy-btn').addEventListener('click', copyReport);
   applyBtn.addEventListener('click', applyTransaction);
   billInput.addEventListener('input', () => {
      calculateTransaction();
      saveState();
   });

   const add000Btn = document.getElementById('add-000-btn');
   if (add000Btn) {
      add000Btn.addEventListener('click', (e) => {
         e.preventDefault();
         const currentVal = billInput.value;

         if (currentVal && currentVal !== '0') {
            billInput.value = currentVal + '000';

            calculateTransaction();
            saveState();

            if (navigator.vibrate) navigator.vibrate(20);
         }
         billInput.focus();
      });
   }

   document.querySelectorAll('.denom-input, #bill-amount').forEach(input => {
      input.addEventListener('focus', (e) => e.target.select());
   });
}

let calcExpr = "";
const calcDisplay = document.getElementById('calc-display');
const calcHistory = document.getElementById('calc-history');

document.querySelectorAll('.btn-calc').forEach(btn => {
   btn.onclick = () => {
      const val = btn.dataset.val;

      if (val === "C") {
         calcExpr = "";
      } else if (val === "DEL") {
         calcExpr = calcExpr.slice(0, -1);
      } else if (val === "=") {
         try {
            if (calcExpr) {
               calcHistory.textContent = calcExpr + " =";
               calcExpr = eval(calcExpr).toString();
            }
         } catch {
            calcExpr = "Lỗi";
         }
      } else {
         if (calcExpr.length < 15) calcExpr += val;
      }

      calcDisplay.textContent = calcExpr || "0";
   };
});

document.getElementById('calc-sync-total').onclick = () => {
   const currentTotal = DENOMS.reduce((sum, d) => sum + d * (counts[d] || 0), 0);
   calcExpr = currentTotal.toString();
   calcDisplay.textContent = calcExpr;
   calcHistory.textContent = "Tổng két hiện tại:";
};

window.addEventListener('DOMContentLoaded', init);
