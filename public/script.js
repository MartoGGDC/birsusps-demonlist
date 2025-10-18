let levels = [];
let isAdmin = false;
let token = localStorage.getItem("jwt") || null;
let editingIndex = null;

/* ---------- Helpers ---------- */
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* ---------- API ---------- */
async function fetchLevels() {
  const res = await fetch("/api/levels");
  levels = await res.json();
  renderLevelsView(document.getElementById("list"), levels);
}

async function saveLevel(level) {
  const res = await fetch("/api/levels/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(level),
  });
  if (res.ok) await fetchLevels();
}

async function deleteLevel(rank) {
  const res = await fetch("/api/levels/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rank }),
  });
  if (res.ok) await fetchLevels();
}

async function createLevel() {
  const res = await fetch("/api/levels/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.ok) await fetchLevels();
}

/* ---------- Rendering ---------- */
function renderLevelsView(container, levelsArr) {
  container.innerHTML = "";
  levelsArr.sort((a, b) => a.rank - b.rank);
  levelsArr.forEach((level, index) => {
    const section = document.createElement("section");
    section.className =
      "bg-zinc-800 p-4 rounded-2xl shadow-lg hover:bg-zinc-700 hover:ring-2 hover:ring-indigo-500 transition-all duration-300 ease-out opacity-0 translate-y-4";
    section.dataset.rank = String(level.rank);

    const youtubeThumbnail = level.youtube
      ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(
          level.youtube
        )}" target="_blank" rel="noopener noreferrer" class="flex-shrink-0 mr-4">
           <img src="https://img.youtube.com/vi/${encodeURIComponent(
             level.youtube
           )}/hqdefault.jpg"
                alt="${escapeHtml(
                  level.title
                )} YouTube Video Thumbnail"
                class="w-32 h-18 rounded-lg hover:scale-105 transition-transform object-cover"/>
         </a>`
      : "";

    const editButtons = isAdmin
      ? `<button class="editBtn ml-2 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 text-sm">Edit</button>
         <button class="deleteBtn ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 text-sm">Delete</button>`
      : "";

    section.innerHTML = `
      <div class="flex items-start">
        ${youtubeThumbnail}
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-zinc-100">#${level.rank} - ${escapeHtml(
      level.title || "-"
    )}</h2>
            <div class="flex items-center">
              <span class="text-sm text-zinc-400">by ${escapeHtml(
                level.creator || "-"
              )}</span>
              ${editButtons}
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(section);
    setTimeout(() => {
      section.classList.remove("opacity-0", "translate-y-4");
    }, index * 100);

    if (isAdmin) {
      section.querySelector(".editBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(level);
      });
      section.querySelector(".deleteBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        showConfirmPopup(
          `Delete level #${level.rank} - ${level.title}?`,
          () => deleteLevel(level.rank)
        );
      });
    }
  });

  if (isAdmin) {
    const btn = document.createElement("button");
    btn.textContent = "Create Level";
    btn.className =
      "px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm";
    btn.onclick = createLevel;
    container.appendChild(btn);
  }
}

/* ---------- Modals ---------- */
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const cancelEdit = document.getElementById("cancelEdit");

function openEditModal(level) {
  editingIndex = levels.findIndex((l) => l.rank === level.rank);
