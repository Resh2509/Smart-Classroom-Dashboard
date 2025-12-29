const firebaseConfig = {
  apiKey: "AIzaSyD37M7neLa8bIoKdYl1UkX8QdlvwF7-hGk",
  authDomain: "smart-classroom-9e989.firebaseapp.com",
  projectId: "smart-classroom-9e989",
  storageBucket: "smart-classroom-9e989.firebasestorage.app",
  messagingSenderId: "1036267070226",
  appId: "1:1036267070226:web:12cbecda3364b1c769496b"
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
console.log("Firebase initialized");

const auth = firebase.auth();
const db = firebase.firestore();

//filter dashboard
function filterDashboard() {
  const filter = document.getElementById("classFilter").value.toUpperCase();
  const cards = document.querySelectorAll(".classroom");

  cards.forEach(card => {
    const title = card.querySelector("h3").innerText.toUpperCase();
    card.style.display = title.includes(filter) ? "" : "none";
  });
}

//LAST UPDATED TIME
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ✅ LOGIN FUNCTION
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      // 🔹 Redirect to dashboard page after successful login
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(err.message));
}


// ✅ MARK ATTENDANCE (QR SIMULATION)
function markAttendance() {
  const classId = document.getElementById("classId").value;
  const user = auth.currentUser;

  if (!classId || !user) {
    alert("Missing classroom ID or not logged in");
    return;
  }

  db.collection("attendance").add({
    classId: classId,
    teacherId: user.uid,
    status: "present",
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Attendance marked successfully");
  });
}

// 🔹 STATUS COUNTER FUNCTION
function updateStatusCounter() {
  let green = 0, yellow = 0, red = 0, colorless = 0;
  document.querySelectorAll('.classroom').forEach(div => {
    if(div.classList.contains('green')) green++;
    else if(div.classList.contains('yellow')) yellow++;
    else if(div.classList.contains('red')) red++;
    else colorless++;
  });
  document.getElementById('greenCount').innerText = green;
  document.getElementById('yellowCount').innerText = yellow;
  document.getElementById('redCount').innerText = red;
  document.getElementById('colorlessCount').innerText = colorless;
}

// 📊 REAL-TIME DASHBOARD & DEMO DATA
function setupDashboard() {
  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";

  db.collection("classrooms").onSnapshot(snapshot => {
    dashboard.innerHTML = "";

    snapshot.forEach(doc => {
      const div = document.createElement("div");
      div.className = "classroom colorless";
      div.innerHTML = `
         <h3>${doc.data().name}</h3>
         <p>Waiting</p>
      `;
      dashboard.appendChild(div);

      let attendanceFound = false;

      // Listen for attendance for this classroom
      db.collection("attendance")
        .where("classId", "==", doc.id)
        .onSnapshot(att => {
          if (!att.empty) {
            attendanceFound = true;
            div.className = "classroom green";
            div.innerHTML = `
  		<h3>${doc.data().name}</h3>
  		<p>Staff Present</p>
	    `;
            updateStatusCounter();
          }
        });

      // After 5 sec → Waiting (YELLOW)
      setTimeout(() => {
        if (!attendanceFound) {
          div.className = "classroom yellow";
          div.innerHTML = `
		            <h3>${doc.data().name}</h3>
		            <p>Waiting for Substitute</p>
          `;
          updateStatusCounter();
        }
      }, 5000);

      // After 10 sec → Absent (RED)
      setTimeout(() => {
        if (!attendanceFound) {
          div.className = "classroom red";
          div.innerHTML = `
		          <h3>${doc.data().name}</h3>
		          <p>Staff Absent</p>
	        `;
          updateStatusCounter();
        }
      }, 10000);

      // After 20 sec → Reset to colorless (demo cycle)
      setTimeout(() => {
        div.className = "classroom colorless";
        div.innerHTML = `
		          <h3>${doc.data().name}</h3>
		          <p>Waiting</p>
	      `;
        attendanceFound = false;
        updateStatusCounter();
      }, 20000);
    });
  });

  // 🔁 SUBSTITUTE TEACHER LOGIC
  db.collection("attendance").onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === "added") {
        const data = change.doc.data();
        const classroomDivs = document.querySelectorAll(".classroom");

        classroomDivs.forEach(div => {
          if (div.querySelector("h3").innerText === data.classId) {
            div.className = "classroom green";
            div.innerHTML = `
		            <h3>${data.classId}</h3>
		            <p>Staff Present</p>
	          `;
            updateStatusCounter();
          }
        });
      }
    });
  });
}

// ✅ DEMO SAMPLE DATA (optional)
function populateDemoData() {
  const classrooms = [
    { id: "AIDS-101", name: "AIDS - A" },
    { id: "AIDS-102", name: "AIDS - B" },
    { id: "AIDS-103", name: "AIDS - C" },
    { id: "AIDS-104", name: "AIDS - D" },
    { id: "AIDS-105", name: "AIDS - E" },
    { id: "AIDS-106", name: "AIDS - F" },
    { id: "AIDS-107", name: "AIDS - G" },
    { id: "AIDS-108", name: "AIDS - H" }

  ];

  classrooms.forEach(c => {
    db.collection("classrooms").doc(c.id).set({ name: c.name });
  });
}

// 🔹 Auto-update "Last Updated" timestamp
function updateLastUpdatedTime() {
  const now = new Date();
  const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById("updateTime").innerText = formatted;
}
setInterval(updateLastUpdatedTime, 1000); // every 1 second

// 🔹 DEMO MODE (simulate attendance automatically)
function demoMode() {
  const classIds = ['AIDS-101','AIDS-102','AIDS-103','AIDS-104','AIDS-105','AIDS-106','AIDS-107','AIDS-108'];
  let index = 0;
  setInterval(() => {
    const classId = classIds[index % classIds.length];
    db.collection('attendance').add({
      classId: classId,
      teacherId: 'demo',
      status: 'present',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    index++;
  }, 7000); // every 7 seconds
}

// 🔹 AUTO LOGOUT after inactivity
let inactivityTime = function () {
  let time;
  window.onload = resetTimer;
  document.onmousemove = resetTimer;
  document.onkeypress = resetTimer;
  document.onclick = resetTimer;

  function logout() {
    auth.signOut().then(() => {
      alert("Logged out due to inactivity");
      document.getElementById("loginBox").style.display = "block";
      document.getElementById("attendanceBox").style.display = "none";
    });
  }

  function resetTimer() {
    clearTimeout(time);
    time = setTimeout(logout, 5*60*1000); // 5 minutes
  }
};
inactivityTime();

// Initialize dashboard and populate demo data
populateDemoData();
setupDashboard();
// demoMode(); // Uncomment to enable demo mode