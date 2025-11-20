const BASE_URL = "https://rating-platform-backend.onrender.com";

/* ==========================
    Load Dashboard Stats
========================== */
async function loadStats() {
    const res = await fetch(`${BASE_URL}/admin/stats`);
    const data = await res.json();

    document.getElementById("totalUsers").innerText = data.totalUsers;
    document.getElementById("totalRatings").innerText = data.totalRatings;
    document.getElementById("totalTasks").innerText = data.totalTasks;
    document.getElementById("totalEarnings").innerText = "₹" + data.totalEarnings;
}

/* ==========================
    Load All Users
========================== */
async function loadUsers() {
    const res = await fetch(`${BASE_URL}/admin/users`);
    const users = await res.json();

    const body = document.querySelector("#userTable tbody");
    body.innerHTML = "";

    Object.entries(users).forEach(([id, user]) => {
        const row = `
        <tr>
            <td>${id}</td>
            <td>₹${user.balance}</td>
            <td>${user.ratingsDone}</td>
            <td><button onclick="openAmountModal('${id}')">Manage</button></td>
        </tr>`;
        body.insertAdjacentHTML("beforeend", row);
    });
}

/* ==========================
    Search User
========================== */
document.getElementById("searchBox").addEventListener("keyup", () => {
    const term = searchBox.value.toLowerCase();
    document.querySelectorAll("#userTable tbody tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
    });
});

/* ==========================
    Modal for Add / Cut Amount
========================== */
function openAmountModal(userId) {
    document.getElementById("selectedUser").innerText = "User: " + userId;
    document.getElementById("amountModal").style.display = "flex";

    document.getElementById("addBtn").onclick = () => updateAmount(userId, "add");
    document.getElementById("cutBtn").onclick = () => updateAmount(userId, "cut");
}

document.getElementById("closeModal").onclick = () => {
    document.getElementById("amountModal").style.display = "none";
};

async function updateAmount(userId, type) {
    const value = Number(document.getElementById("amountInput").value);
    if (!value) return alert("Enter valid amount");

    const url = type === "add"
        ? `${BASE_URL}/admin/addAmount`
        : `${BASE_URL}/admin/cutAmount`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: value })
    });

    const data = await res.json();
    document.getElementById("msgAmount").innerText = data.success ? "Success!" : data.message;

    loadUsers();
    loadStats();
}

/* ==========================
    Settings Toggles
========================== */
async function loadSettings() {
    const res = await fetch(`${BASE_URL}/admin/settings`);
    const s = await res.json();

    document.getElementById("ratingToggle").checked = s.ratingEnabled;
    document.getElementById("withdrawToggle").checked = s.withdrawEnabled;
}

document.getElementById("ratingToggle").onchange = () => {
    fetch(`${BASE_URL}/admin/toggleRating`, { method: "POST" });
};

document.getElementById("withdrawToggle").onchange = () => {
    fetch(`${BASE_URL}/admin/toggleWithdraw`, { method: "POST" });
};

document.getElementById("resetBtn").onclick = () => {
    fetch(`${BASE_URL}/admin/resetRatings`, { method: "POST" });
    alert("Ratings reset!");
};

/* ==========================
    INIT
========================== */
document.addEventListener("DOMContentLoaded", () => {
    loadStats();
    loadUsers();
    loadSettings();
});
