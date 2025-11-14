/***************************************
 * SAMVIDHA FRONTEND JS (FINAL VERSION)
 * Works with index.html as login page
***************************************/

console.log("app.js loaded");

// -----------------------------
// CONFIG
// -----------------------------
const API_BASE = "https://samvidha-backend.onrender.com/";   // CHANGE IF NEEDED

// -----------------------------
// TOKEN HELPERS
// -----------------------------
function setToken(t){ localStorage.setItem("sam_token", t); }
function getToken(){ return localStorage.getItem("sam_token"); }
function clearToken(){ localStorage.removeItem("sam_token"); }

// -----------------------------
// API FETCH WRAPPER
// -----------------------------
async function api(path, options = {}) {
    options.headers = options.headers || {};
    const t = getToken();
    if (t) options.headers["Authorization"] = "Bearer " + t;

    const res = await fetch(API_BASE + path, options);

    if(res.status === 401){
        clearToken();
        location.href = "index.html";    // back to login
        return;
    }

    return res.json();
}

// -----------------------------------------
// DETECT PAGE (LOGIN OR DASHBOARD)
// -----------------------------------------
const path = window.location.pathname;

// If login page
if (path.includes("index.html") || path === "/" || path === "/samvidha-frontend/") {

    console.log("Login page detected");

    const form = document.getElementById("loginForm");
    const alertBox = document.getElementById("loginAlert");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            alertBox.classList.add("d-none");

            const user = document.getElementById("username").value.trim();
            const pass = document.getElementById("password").value.trim();

            try {
                const res = await fetch(API_BASE + "login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: user, password: pass })
                });

                const j = await res.json();

                if (j.ok) {
                    setToken(j.token);
                    window.location = "dashboard.html";   // ← REDIRECT
                } else {
                    alertBox.innerText = "Invalid credentials";
                    alertBox.classList.remove("d-none");
                }

            } catch(err) {
                alertBox.innerText = "Network error. Try again.";
                alertBox.classList.remove("d-none");
            }
        });
    }
}



// -----------------------------
// DASHBOARD PAGE
// -----------------------------
if (path.includes("dashboard.html")) {

    console.log("Dashboard detected");

    // NAVIGATION HANDLING
    const links = document.querySelectorAll(".nav-link[data-view]");
    const views = document.querySelectorAll(".view");

    function showView(v) {
        views.forEach(view => view.classList.add("d-none"));
        document.getElementById("view-" + v).classList.remove("d-none");
        document.getElementById("pageTitle").innerText = v.charAt(0).toUpperCase() + v.slice(1);
    }

    links.forEach(a => {
        a.addEventListener("click", () => {
            links.forEach(x => x.classList.remove("active"));
            a.classList.add("active");

            const view = a.dataset.view;
            showView(view);

            if(view === "attendance") loadAttendance();
            if(view === "marks") loadMarks();
            if(view === "profile") loadProfile();
        });
    });

    // LOGOUT
    const logoutBtn = document.getElementById("btnLogout");
    if(logoutBtn){
        logoutBtn.onclick = () => {
            clearToken();
            location.href = "index.html";
        }
    }

    // -----------------------------
    // LOAD OVERVIEW FOR DASHBOARD
    // -----------------------------
    async function loadOverview() {
        try {
            const j = await api("all");

            if (!j.ok) return;

            // PROFILE
            const p = j.profile;
            document.getElementById("userName").innerText = p["Name"] || "Student";

            // ATTENDANCE CHART
            const att = j.attendance || [];
            const labels = att.map(x => x["Course Code"]);
            const values = att.map(x => parseFloat(x["Attendance %"]) || 0);

            new Chart(document.getElementById("attendanceChart"), {
                type: "bar",
                data: {
                    labels,
                    datasets: [{
                        label: "Attendance %",
                        data: values,
                        backgroundColor: "#4F46E5"
                    }]
                }
            });

            // MARKS CHART
            const th = j.midmarks.theory || [];
            const mlabels = th.map(x => x["Course Code"]);
            const mvals = th.map(x => parseFloat(x["Total Marks (40M)"]) || 0);

            new Chart(document.getElementById("marksChart"), {
                type: "line",
                data: {
                    labels: mlabels,
                    datasets: [{
                        label: "CIA Marks",
                        data: mvals,
                        borderColor: "#06B6D4",
                        tension: 0.35
                    }]
                }
            });

            // PROFILE CARD
            const card = document.getElementById("profileCard");
            card.innerHTML = `
                <strong>Name:</strong> ${p["Name"]}<br>
                <strong>Roll Number:</strong> ${p["Roll Number"]}<br>
                <strong>Branch:</strong> ${p["Branch"]}
            `;

        } catch (err) {
            console.log("Overview error:", err);
        }
    }

    // -----------------------------
    // ATTENDANCE PAGE
    // -----------------------------
    async function loadAttendance() {
        const wrap = document.getElementById("attendanceTableWrap");
        wrap.innerHTML = "Loading...";

        const j = await api("attendance");
        wrap.innerHTML = createTable(j.attendance);
    }

    // -----------------------------
    // MID MARKS PAGE
    // -----------------------------
    async function loadMarks() {
        const wrap = document.getElementById("marksTablesWrap");
        wrap.innerHTML = "Loading...";

        const j = await api("midmarks");

        wrap.innerHTML =
            `<h5>Theory</h5>` +
            createTable(j.midmarks.theory) +
            `<h5 class="mt-3">Laboratory</h5>` +
            createTable(j.midmarks.laboratory);
    }

    // -----------------------------
    // PROFILE PAGE
    // -----------------------------
    async function loadProfile() {
        const wrap = document.getElementById("profileWrap");
        wrap.innerHTML = "Loading...";

        const j = await api("profile");
        const p = j.profile;

        wrap.innerHTML = Object.keys(p)
            .map(k => `<div class="d-flex justify-content-between border-bottom py-2">
                        <strong>${k}</strong><span>${p[k]}</span>
                       </div>`)
            .join("");
    }

    // -----------------------------
    // TABLE GENERATOR
    // -----------------------------
    function createTable(rows) {
        if (!rows || rows.length === 0) return "<p>No data</p>";

        const keys = Object.keys(rows[0]);

        let html = `<table class="table table-sm table-striped"><thead><tr>`;
        keys.forEach(k => html += `<th>${k}</th>`);
        html += `</tr></thead><tbody>`;

        rows.forEach(r => {
            html += `<tr>`;
            keys.forEach(k => html += `<td>${r[k]}</td>`);
            html += `</tr>`;
        });

        html += `</tbody></table>`;
        return html;
    }

    // INITIAL LOAD
    showView("dashboard");
    loadOverview();
}

