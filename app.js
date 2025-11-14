/*******************************************
 * FINAL ATTENDANCE-ONLY APP.JS
 *******************************************/

/* ========= CONFIG ========= */
const API_BASE = "https://web-production-d582e.up.railway.app/";  // <-- your backend
const FETCH_TIMEOUT = 35000; // 35 seconds timeout

/* ========= TOKEN + LOGIN ========= */
function saveToken(t) {
    localStorage.setItem("sam_token", t);
}
function getToken() {
    return localStorage.getItem("sam_token");
}
function logout() {
    localStorage.removeItem("sam_token");
    window.location = "index.html";
}

/* ========= REQUEST WITH TIMEOUT ========= */
async function fetchTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
    const controller = new AbortController();
    options.signal = controller.signal;

    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, options);
        clearTimeout(timer);
        return res;
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

/* ========= API WRAPPER ========= */
async function api(endpoint, options = {}) {
    const token = getToken();
    options.headers = options.headers || {};
    if (token) options.headers["Authorization"] = "Bearer " + token;

    try {
        const response = await fetchTimeout(API_BASE + endpoint, options);
        const text = await response.text();

        try {
            return JSON.parse(text);
        } catch {
            return { ok: false, error: "invalid_response", raw: text };
        }

    } catch (err) {
        return { ok: false, error: err.message || "network_error" };
    }
}

/* ========= LOGIN HANDLER ========= */
if (window.location.pathname.includes("index.html")) {
    document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        const res = await api("login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            document.getElementById("loginError").classList.remove("d-none");
            return;
        }

        saveToken(res.token);
        window.location = "dashboard.html";
    });
}

/* ========= GAUGE CHART ========= */
let gaugeChart;

/* ========= CAR NEEDLE SPEEDOMETER ========= */
/* ====== FINAL RESPONSIVE NEEDLE GAUGE ====== */
function drawGauge(percent) {
    const needle = document.getElementById("needle");
    const speedText = document.getElementById("speedText");

    if (!needle || !speedText) {
        console.log("Speedometer elements missing");
        return;
    }

    // Convert percentage -> needle angle
    const angle = (percent * 1.8) - 90;

    // Animate needle
    needle.style.transform = `rotate(${angle}deg)`;

    // Animate number
    let start = 0;
const end = parseFloat(percent);
const step = end / 40;

const anim = setInterval(() => {
    start += step;
    if (start >= end) {
        start = end;
        clearInterval(anim);
    }
    speedText.textContent = start.toFixed(2) + "%";
}, 15);

}


/* ========= SUBJECT BAR CHART ========= */
let subjectChart;

function drawBarChart(att) {
    const canvas = document.getElementById("subjectChart");
    if (!canvas) return;

    const labels = [];
    const values = [];

    att.forEach(row => {
        const name = row["Course Name"] || row["Subject Name"] || row["Subject"] || "Subject";
        const percent = parseFloat(String(row["Attendance %"]).replace("%", "")) || 0;

        labels.push(name.slice(0, 20));
        values.push(percent);
    });

    const ctx = canvas.getContext("2d");
    if (subjectChart) subjectChart.destroy();

    subjectChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "% Attendance",
                data: values,
                backgroundColor: values.map(v =>
                    v >= 85 ? "#4ade80" : v >= 75 ? "#facc15" : "#f87171"
                ),
                borderRadius: 8
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: "white" }},
                y: { ticks: { color: "white" }, max: 100 }
            }
        }
    });
}

/* ========= TABLE RENDER ========= */
function renderTable(att) {
    const wrap = document.getElementById("attendanceTableWrap");

    let rows = "";
    att.forEach((row, i) => {
        const subject = row["Course Name"] || row["Subject Name"] || row["Subject"];
        const held = row["Held"] || row["Total"];
        const attended = row["Attended"] || row["Present"];
        const percent = parseFloat(String(row["Attendance %"]).replace("%","")) || 0;

        const badge =
            percent >= 85 ? "badge-safe" :
            percent >= 75 ? "badge-warn" :
            "badge-critical";

        const points = Math.round((percent / 100) * 10);

        rows += `
            <tr class="row-anim" style="animation-delay:${i*50}ms">
                <td>${subject}</td>
                <td>${held}</td>
                <td>${attended}</td>
                <td>${parseFloat(percent).toFixed(2)}%</td>
                <td><span class="${badge}">${percent >= 85 ? "Safe" : percent >= 75 ? "Warning" : "Critical"}</span></td>
                <td>${points} pts</td>
            </tr>
        `;
    });

    wrap.innerHTML = `
        <table class="table-glass w-100">
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Held</th>
                    <th>Attended</th>
                    <th>Attendance</th>
                    <th>Status</th>
                    <th>Points</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

/* ========= MAIN LOAD ========= */
async function loadAttendance() {
    const res = await api("attendance", { method: "GET" });

    if (!res.ok) {
        alert("Failed to load attendance!");
        return;
    }

    const data = res.attendance || res.data || res;

    // Draw components
    renderTable(data);

    const overall = (
    data.reduce((s, r) => s + (parseFloat(String(r["Attendance %"]).replace("%","")) || 0), 0)
    / data.length
).toFixed(2);


    drawGauge(overall);
    drawBarChart(data);
}

/* ========= INIT DASHBOARD ========= */
if (window.location.pathname.includes("dashboard.html")) {
    document.addEventListener("DOMContentLoaded", loadAttendance);
}
