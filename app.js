const API_BASE = "https://samvidha-backend.onrender.com/"; // CHANGE THIS

function setToken(t){ localStorage.setItem("sam_token", t); }
function getToken(){ return localStorage.getItem("sam_token"); }
function clearToken(){ localStorage.removeItem("sam_token"); }

async function api(path, options={}){
  options.headers = options.headers || {};
  const t = getToken();
  if(t) options.headers["Authorization"] = "Bearer " + t;
  const res = await fetch(API_BASE + path, options);
  if(res.status === 401){
    clearToken();
    location.href = "login.html";
  }
  return res.json();
}

/**************** LOGIN PAGE *****************/
if(document.getElementById("loginForm")){
  loginForm.addEventListener("submit", async(e)=>{
    e.preventDefault();
    loginAlert.classList.add("d-none");
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API_BASE + "login", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username, password})
    });
    const j = await res.json();
    if(j.ok){
      setToken(j.token);
      location.href = "dashboard.html";
    } else {
      loginAlert.classList.remove("d-none");
      loginAlert.classList.add("alert-danger");
      loginAlert.innerText = "Login failed";
    }
  });
}

/**************** DASHBOARD PAGE *****************/
if(document.getElementById("view-dashboard")){
  const views = document.querySelectorAll(".view");
  const links = document.querySelectorAll(".nav-link[data-view]");

  function showView(v){
    views.forEach(s => s.classList.add("d-none"));
    document.getElementById("view-"+v).classList.remove("d-none");
  }

  links.forEach(a => {
    a.addEventListener("click", ()=>{
      links.forEach(x=>x.classList.remove("active"));
      a.classList.add("active");
      showView(a.dataset.view);
      if(a.dataset.view==="attendance") loadAttendance();
      if(a.dataset.view==="marks") loadMarks();
      if(a.dataset.view==="profile") loadProfile();
    });
  });

  document.getElementById("btnLogout").onclick = ()=>{
    clearToken();
    location.href="login.html";
  };

  async function loadOverview(){
    const j = await api("all");
    if(!j.ok) return;

    // profile
    const p = j.profile || {};
    document.getElementById("userName").innerText = p["Name"] || "Student";

    // attendance chart
    const att = j.attendance || [];
    const labels = att.map(r=>r["Course Code"]);
    const vals = att.map(r=>parseFloat(r["Attendance %"])||0);
    new Chart(document.getElementById("attendanceChart"), {
      type:"bar", data:{labels, datasets:[{label:"Attendance %", data:vals}]}
    });

    // marks chart
    const th = j.midmarks.theory || [];
    const mlabels = th.map(r=>r["Course Code"]);
    const mvals = th.map(r=>parseFloat(r["Total Marks (40M)"])||0);
    new Chart(document.getElementById("marksChart"), {
      type:"line", data:{labels:mlabels, datasets:[{label:"CIA Marks", data:mvals}]}
    });
  }

  async function loadAttendance(){
    const j = await api("attendance");
    renderTable("#attendanceTableWrap", j.attendance);
  }

  async function loadMarks(){
    const j = await api("midmarks");
    const w = document.getElementById("marksTablesWrap");
    w.innerHTML = "<h5>Theory</h5>";
    renderTableElement(w, j.midmarks.theory);
    w.innerHTML += "<h5 class='mt-3'>Laboratory</h5>";
    renderTableElement(w, j.midmarks.laboratory);
  }

  async function loadProfile(){
    const j = await api("profile");
    const p = j.profile;
    const w = document.getElementById("profileWrap");
    w.innerHTML = "";
    for(const k in p){
      w.innerHTML += `
      <div class="d-flex justify-content-between border-bottom py-2">
        <strong>${k}</strong>
        <span>${p[k]}</span>
      </div>`;
    }
  }

  function renderTable(sel, data){
    const wrap = document.querySelector(sel);
    wrap.innerHTML = "";
    renderTableElement(wrap, data);
  }

  function renderTableElement(wrap, data){
    if(!data || data.length===0){
      wrap.innerHTML += "<p class='text-muted'>No data</p>";
      return;
    }
    const keys = Object.keys(data[0]);
    let html = `<table class="table table-striped table-sm"><thead><tr>`;
    keys.forEach(k=> html+=`<th>${k}</th>`);
    html += `</tr></thead><tbody>`;
    data.forEach(r=>{
      html += "<tr>";
      keys.forEach(k=> html+=`<td>${r[k]}</td>`);
      html += "</tr>";
    });
    html += "</tbody></table>";
    wrap.innerHTML += html;
  }

  // load dashboard
  showView("dashboard");
  loadOverview();
}
