let levels = [];
let isAdmin = false;
let token = localStorage.getItem("jwt") || null;
let editingIndex = null;

/* ---------- Helpers ---------- */
function pointercratePoints(rank) {
  return 150 * Math.pow(0.95, Math.max(0, rank - 1));
}
function parsePercent(str) {
  if (!str) return 0;
  const m = String(str).trim().match(/^(\d+(\.\d+)?)\s*%?$/);
  return m ? parseFloat(m[1]) : 0;
}
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
  else {
    const err = await res.json();
    showPopup(err.message || "Error saving level", true);
  }
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
    level.recordHolders.sort(
      (a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0)
    );

    const holdersHTML = level.recordHolders.length
      ? level.recordHolders
          .map(
            (h) =>
              `${h.verified
                ? `<span class="text-purple-400 drop-shadow-[0_0_2px_purple]">${escapeHtml(
                    h.name
                  )}</span>`
                : escapeHtml(h.name)
              } - ${escapeHtml(h.percent)}${h.verified
                ? ' <span class="text-zinc-400">(Verified)</span>'
                : ""}`
          )
          .join("")
      : `<li class="list-none text-zinc-500">No record holders yet.</li>`;

    const section = document.createElement("section");
    section.className =
      "bg-zinc-800 p-4 rounded-2xl shadow-lg hover:bg-zinc-700 hover:ring-2 hover:ring-indigo-500 transition-all duration-300 ease-out opacity-0 translate-y-4";
    section.dataset.creator = (level.creator || "").toLowerCase();
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
          <div class="mt-2 border-t border-zinc-700 pt-2 record-holders" style="display:none;">
            <p class="text-sm text-zinc-100 mb-1">Record Holders:</p>
            <ul class="text-sm space-y-1 text-zinc-100">${holdersHTML}</ul>
          </div>
        </div>
      </div>
    `;
    container.appendChild(section);
    setTimeout(() => {
      section.classList.remove("opacity-0", "translate-y-4");
    }, index * 100);

    section.addEventListener("click", (e) => {
      if (!e.target.closest("a")) {
        const holdersDiv = section.querySelector(".record-holders");
        holdersDiv.style.display =
          holdersDiv.style.display === "none" ? "block" : "none";
      }
    });

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

/* ---------- Modals & Popups ---------- */
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const cancelEdit = document.getElementById("cancelEdit");

function openEditModal(level) {
  editingIndex = levels.findIndex((l) => l.rank === level.rank);
  document.getElementById("editRank").value = level.rank;
  document.getElementById("editTitle").value = level.title;
  document.getElementById("editCreator").value = level.creator;
  document.getElementById("editRecords").value = level.recordHolders
    .map((r) => `${r.name}-${r.percent}-${r.verified ? "true" : "false"}`)
    .join(",");
  editModal.classList.remove("hidden");
}

cancelEdit.addEventListener("click", () => editModal.classList.add("hidden"));

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const originalRank = levels[editingIndex]?.rank; // ✅ track original
  const newRank = parseInt(document.getElementById("editRank").value);

  const lvl = {
    originalRank, // ✅ backend needs this for swapping
    rank: newRank,
    title: document.getElementById("editTitle").value,
    creator: document.getElementById("editCreator").value,
    recordHolders: document
      .getElementById("editRecords")
      .value.split(",")
      .filter((s) => s.trim())
      .map((s) => {
        const parts = s.split("-");
        return {
          name: parts[0]?.trim() || "",
          percent: parts[1]?.trim() || "0%",
          verified: parts[2]?.trim().toLowerCase() === "true",
        };
      }),
  };

  editModal.classList.add("hidden");
  await saveLevel(lvl);
});

/* ---------- Login ---------- */
const loginBtn = document.getElementById("loginBtn");
const loginModal = document.getElementById("loginModal");
const cancelLogin = document.getElementById("cancelLogin");
const confirmLogin = document.getElementById("confirmLogin");

loginBtn.addEventListener("click", () => loginModal.classList.remove("hidden"));
cancelLogin.addEventListener("click", () =>
  loginModal.classList.add("hidden")
);
confirmLogin.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (res.ok) {
    const data = await res.json();
    token = data.token;
    localStorage.setItem("jwt", token);
    isAdmin = true;
    loginModal.classList.add("hidden");
    showPopup("✅ Logged in successfully!");
    fetchLevels();
  } else {
    showPopup("❌ Invalid login.", true);
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
