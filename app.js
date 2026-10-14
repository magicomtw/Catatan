const STORAGE_KEY = "laporan-pakaian-v1";
const HISTORY_KEY = "laporan-pakaian-history-v1";

let items = [];
let history = [];
let toastTimer;

const $ = (id) => document.getElementById(id);
const form = $("itemForm");
const tableBody = $("tableBody");

function todayLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

$("dateLabel").textContent = todayLabel();

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function saveHistoryLocal() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

function render() {
  tableBody.innerHTML = "";

  items.forEach((item, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${safeText(item.name)}</td>
      <td>${safeText(item.color)}</td>
      <td>${safeText(item.size)}</td>
      <td>${safeText(item.quantity || "—")}</td>
      <td class="action-column">
        <div class="row-actions">
          <button class="mini-button" data-edit="${index}" type="button">Edit</button>
          <button class="mini-button delete" data-delete="${index}" type="button">Hapus</button>
        </div>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  $("emptyState").hidden = items.length > 0;
  $("rowCount").textContent = String(items.length);
  renderHistory();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const item = {
    name: $("nameInput").value.trim(),
    color: $("colorInput").value.trim(),
    size: $("sizeInput").value.trim(),
    quantity: $("quantityInput").value.trim()
  };

  if (!item.name || !item.color || !item.size || item.quantity === "") {
    showToast("Lengkapi semua kolom terlebih dahulu.");
    return;
  }

  items.push(item);
  saveLocal();
  render();
  form.reset();
  $("nameInput").focus();

  showToast("Data ditambahkan dan tersimpan otomatis.");
});

tableBody.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const index = Number(editButton.dataset.edit);
    const item = items[index];

    if (!item) return;

    $("nameInput").value = item.name;
    $("colorInput").value = item.color;
    $("sizeInput").value = item.size;
    $("quantityInput").value = item.quantity || "";

    items.splice(index, 1);
    saveLocal();
    render();
    $("nameInput").focus();

    showToast("Data dimuat ke formulir. Tekan Tambah ke tabel setelah selesai mengedit.");
  }

  if (deleteButton) {
    const index = Number(deleteButton.dataset.delete);

    if (!items[index]) return;

    if (confirm(`Hapus baris "${items[index].name}"?`)) {
      items.splice(index, 1);
      saveLocal();
      render();
      showToast("Baris dihapus.");
    }
  }
});

$("downloadBtn").addEventListener("click", async () => {
  if (!items.length) {
    showToast("Tambahkan data terlebih dahulu sebelum mengunduh PNG.");
    return;
  }

  if (typeof html2canvas !== "function") {
    showToast("Fitur gambar belum termuat. Periksa koneksi internet lalu coba lagi.");
    return;
  }

  const report = $("reportCanvas");
  const button = $("downloadBtn");

  report.classList.add("exporting");
  button.disabled = true;
  button.textContent = "Menyiapkan PNG…";

  try {
    const canvas = await html2canvas(report, {
      backgroundColor: "#fffaf6",
      scale: 2,
      useCORS: true,
      logging: false
    });

    const link = document.createElement("a");
    link.download = `Laporan-Pakaian-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    showToast("Gambar PNG berhasil dibuat.");
  } catch (error) {
    console.error(error);
    showToast("Gagal membuat PNG. Coba muat ulang halaman.");
  } finally {
    report.classList.remove("exporting");
    button.disabled = false;
    button.textContent = "↓ Download PNG";
  }
});

$("newReportBtn").addEventListener("click", () => {
  if (items.length && !confirm("Mulai laporan kosong? Data saat ini akan disimpan ke riwayat terlebih dahulu.")) {
    return;
  }

  if (items.length) {
    history.unshift({
      id: makeId(),
      name: `Laporan ${todayLabel()}`,
      createdAt: new Date().toISOString(),
      items: JSON.parse(JSON.stringify(items))
    });

    history = history.slice(0, 50);
    saveHistoryLocal();
  }

  items = [];
  saveLocal();
  render();

  showToast("Laporan baru siap diisi.");
});

$("saveHistoryBtn").addEventListener("click", () => {
  if (!items.length) {
    showToast("Belum ada data untuk disimpan.");
    return;
  }

  const name = $("historyName").value.trim() || `Laporan ${todayLabel()}`;

  history.unshift({
    id: makeId(),
    name,
    createdAt: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(items))
  });

  history = history.slice(0, 50);
  saveHistoryLocal();

  $("historyName").value = "";
  renderHistory();

  showToast("Laporan tersimpan di riwayat.");
});

function renderHistory() {
  const container = $("historyList");
  container.innerHTML = "";

  if (!history.length) {
    container.innerHTML = '<p class="subheading">Belum ada riwayat tersimpan.</p>';
    return;
  }

  history.forEach((record) => {
    const div = document.createElement("div");
    div.className = "history-item";

    const date = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(record.createdAt));

    div.innerHTML = `
      <div>
        <strong>${safeText(record.name)}</strong>
        <small>${date} · ${(record.items || []).length} baris</small>
      </div>
      <div class="history-item-actions">
        <button class="mini-button" data-load="${safeText(record.id)}" type="button">Buka</button>
        <button class="mini-button delete" data-remove-history="${safeText(record.id)}" type="button">Hapus</button>
      </div>
    `;

    container.appendChild(div);
  });
}

$("historyList").addEventListener("click", (event) => {
  const load = event.target.closest("[data-load]");
  const remove = event.target.closest("[data-remove-history]");

  if (load) {
    const record = history.find((x) => x.id === load.dataset.load);

    if (!record) return;

    if (items.length && !confirm("Buka riwayat ini? Data aktif akan diganti. Pastikan sudah disimpan jika masih diperlukan.")) {
      return;
    }

    items = JSON.parse(JSON.stringify(record.items || []));
    saveLocal();
    render();

    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Riwayat berhasil dibuka.");
  }

  if (remove) {
    history = history.filter((x) => x.id !== remove.dataset.removeHistory);
    saveHistoryLocal();
    renderHistory();

    showToast("Riwayat dihapus.");
  }
});

$("exportBackupBtn").addEventListener("click", () => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    history
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `Cadangan-Laporan-Pakaian-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("File cadangan diunduh.");
});

$("importBackupInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());

    if (!Array.isArray(data.items) || !Array.isArray(data.history)) {
      throw new Error("Format tidak sesuai");
    }

    if (!confirm("Impor cadangan akan mengganti data dan riwayat saat ini. Lanjutkan?")) {
      return;
    }

    items = data.items
      .filter((x) => x && typeof x.name === "string" &&
        typeof x.color === "string" && typeof x.size === "string")
      .map((x) => ({
        name: x.name,
        color: x.color,
        size: x.size,
        quantity: String(x.quantity ?? "")
      }));

    history = data.history.slice(0, 50);

    saveLocal();
    saveHistoryLocal();
    render();

    showToast("Cadangan berhasil diimpor.");
  } catch (error) {
    showToast("File cadangan tidak valid.");
  } finally {
    event.target.value = "";
  }
});

$("clearBtn").addEventListener("click", () => {
  if (!confirm("Hapus semua data aktif dan seluruh riwayat? Tindakan ini tidak dapat dibatalkan kecuali kamu memiliki file cadangan.")) {
    return;
  }

  items = [];
  history = [];

  saveLocal();
  saveHistoryLocal();
  render();

  showToast("Semua data dihapus.");
});

try {
  items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

  if (!Array.isArray(items)) items = [];
  if (!Array.isArray(history)) history = [];
} catch {
  items = [];
  history = [];
}

render();
