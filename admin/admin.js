document.addEventListener("DOMContentLoaded", () => {
    loadStats();
    loadUsers();
    loadSettings();
});

// Fetch stats
async function loadStats() {
    const res = await fetch("/admin/stats");
    const data = await res.json();

    totalUsers.innerText = data.totalUsers;
    totalRatings.innerText = data.totalRatings;
    totalTasks.innerText = data.totalTasks;
    totalEarnings.innerText = "₹" + data.totalEarnings;
}

// Load users in table
async function loadUsers() {
    const res = await fetch("/admin/users");
    const users = await res.json();

    const body = document.querySelector("#userTable tbody");
    body.innerHTML = "";

    Object.entries(users).forEach(([id, user]) => {
        const row = `
        <tr>
            <td>${id}</td>
            <td>₹${user.balance}</td>
            <td>${user.ratingCount}</td>
            <td><button onclick="openAmountModal('${id}')">Manage</button></td>
        </tr>`;
        body.insertAdjacentHTML("beforeend", row);
    });
}

// Search filter
searchBox.addEventListener("keyup", () => {
    const term = searchBox.value.toLowerCase();
    document.querySelectorAll("#userTable tbody tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
    });
});

/********* Modal Controls ********/
function openAmountModal(userId) {
    selectedUser.innerText = "User ID: " + userId;
    amountModal.style.display = "flex";

    addBtn.onclick = () => updateAmount(userId, "add");
    cutBtn.onclick = () => updateAmount(userId, "cut");
}

closeModal.onclick = () => amountModal.style.display = "none";

async function updateAmount(userId, type) {
    const value = Number(amountInput.value);
    if (!value) return;

    const url = type === "add" ? "/admin/addAmount" : "/admin/cutAmount";

    const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ userId, amount: value })
    });

    const data = await res.json();
    msgAmount.innerText = data.success ? "Success!" : data.message;

    loadUsers();
    loadStats();
}

/*********** Settings Toggles ***********/
async function loadSettings() {
    const res = await fetch("/admin/settings");
    const s = await res.json();

    ratingToggle.checked = s.ratingEnabled;
    withdrawToggle.checked = s.withdrawEnabled;
}

ratingToggle.onchange = () => fetch("/admin/toggleRating", { method: "POST" });
withdrawToggle.onchange = () => fetch("/admin/toggleWithdraw", { method: "POST" });

resetBtn.onclick = () => {
    fetch("/admin/resetRatings", { method: "POST" });
    alert("Ratings reset!");
};
