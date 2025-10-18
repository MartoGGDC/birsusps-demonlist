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
  try {
    const res = await fetch("/api/levels");
    if (!res.ok) throw new Error("Failed to fetch levels");
    levels = await res.json();
    renderLevelsView(document.getElementById("list"), levels);
  } catch (err) {
    console.error(err);
    showPopup("Failed to load levels", true);
  }
}

async function saveLevel(level) {
  try {
    const payload = { ...level };
    if (typeof level.originalRank === "undefined") {
      payload.originalRank = level.originalRankFallback ?? level.rank;
    }

    const res = await fetch("/api/levels/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to save level");
    }

    await fetchLevels();
    showPopup("Level saved");
  } catch (err) {
    console.error(err);
    showPopup(err.message || "Failed to save level", true);
  }
}

async function deleteLevel(rank) {
  try {
    const res = await fetch("/api/levels/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rank }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete level");
    }
    await fetchLevels();
    showPopup("Level deleted");
  } catch (err) {
    console.error(err);
    showPopup(err.message || "Failed to delete level", true);
  }
}

async function createLevel() {
  try {
    const res = await fetch("/api/levels/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create level");
    }
    await fetchLevels();

    // Auto-open modal for the newly created level
    const newLevel = levels.find(
      (l) => !l.title || l.title.trim() === "" || l.title === "-"
    );
    if (newLevel) openEditModal(newLevel);
    else showPopup("New level created");
  } catch (err) {
    console.error(err);
    showPopup(err.message || "Failed to create level", true);
  }
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
      const editBtn = section.querySelector(".editBtn");
      const delBtn = section.querySelector(".deleteBtn");
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(level);
      });
      delBtn.addEventListener("click", (e) => {
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
  document.getElementById("editRank").value = level.rank;
  document.getElementById("editTitle").value = level.title || "";
  document.getElementById("editCreator").value = level.creator || "";
  const ytEl = document.getElementById("editYoutube");
  if (ytEl) ytEl.value = level.youtube || "";
  editModal.dataset.originalRank = String(level.rank);
  editModal.classList.remove("hidden");
}

cancelEdit.addEventListener("click", () => {
  editModal.classList.add("hidden");
  delete editModal.dataset.originalRank;
});

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const originalRank = parseInt(editModal.dataset.originalRank || "");
  if (Number.isNaN(originalRank)) {
    showPopup("Original rank not found", true);
    return;
  }

  let newRank = parseInt(document.getElementById("editRank").value);
  const title = document.getElementById("editTitle").value.trim();
  const creator = document.getElementById("editCreator").value.trim();
  const youtubeEl = document.getElementById("editYoutube");
  const youtube = youtubeEl ? youtubeEl.value.trim() : "";

  // Clamp the rank to valid range
  const maxRank = levels.length;
  if (Number.isNaN(newRank) || newRank < 1) newRank = 1;
  if (newRank > maxRank) newRank = maxRank;

  const updated = {
    originalRank,
    rank: newRank,
    title,
    creator,
    youtube,
  };

  await saveLevel(updated);

  editModal.classList.add("hidden");
  delete editModal.dataset.originalRank;
});

/* ---------- Login ---------- */
const loginBtn = document.getElementById("loginBtn");
const loginModal = document.getElementById("loginModal");
const cancelLogin = document.getElementById("cancelLogin");
const confirmLogin = document.getElementById("confirmLogin");

loginBtn.addEventListener("click", () => loginModal.classList.remove("hidden"));
cancelLogin.addEventListener("click", () => loginModal.classList.add("hidden"));

confirmLogin.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      showPopup("Invalid login", true);
      return;
    }
    const data = await res.json();
    token = data.token;
    localStorage.setItem("jwt", token);
    isAdmin = true;
    loginModal.classList.add("hidden");
    showPopup("Logged in");
    await fetchLevels();
  } catch (err) {
    console.error(err);
    showPopup("Login failed", true);
  }
});

/* ---------- Popups ---------- */
function showPopup(msg, isError = false) {
  const popup = document.createElement("div");
  popup.className = `fixed bottom-5 right-5 px-4 py-2 rounded text-white ${
    isError ? "bg-red-600" : "bg-green-600"
  } shadow-lg`;
  popup.textContent = msg;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 3000);
}

function showConfirmPopup(msg, onConfirm) {
  const div = document.createElement("div");
  div.className =
    "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
  div.innerHTML = `
    <div class="bg-zinc-800 p-6 rounded-2xl w-80 text-center">
      <p class="mb-4 text-zinc-100">${msg}</p>
      <div class="flex justify-center gap-3">
        <button class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500" id="confirmYes">Yes</button>
        <button class="px-3 py-1 bg-zinc-600 text-white rounded hover:bg-zinc-500" id="confirmNo">No</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.querySelector("#confirmYes").onclick = () => {
    div.remove();
    onConfirm();
  };
  div.querySelector("#confirmNo").onclick = () => div.remove();
}

/* ---------- Init ---------- */
fetchLevels();
