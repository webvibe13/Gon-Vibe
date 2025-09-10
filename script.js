// ---------- DARK / LIGHT THEME ----------
const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
});

// ---------- HERO SLIDES ----------
const slides = [...document.querySelectorAll('.slide')];
let idx = 0;
setInterval(() => {
  slides[idx].classList.remove('active');
  idx = (idx + 1) % slides.length;
  slides[idx].classList.add('active');
}, 4000); // every 4 seconds

// ---------- TIME SLOTS (09:00–18:00 every 30 min) ----------
const timePicker = document.getElementById('timePicker');
const datePicker = document.getElementById('datePicker');
function genSlots(){
  const slots = [];
  for(let h=9; h<=18; h++){
    for(let m of [0,30]){
      const hh = String(h).padStart(2,'0');
      const mm = String(m).padStart(2,'0');
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}
async function loadAvailableTimes(dateStr){
  timePicker.innerHTML = '';
  const baseSlots = genSlots();
  if(!dateStr){
    baseSlots.forEach(s => timePicker.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`));
    return;
  }
  // Fetch taken slots for that date
  const q = L.query(L.collection(db,'bookings'), L.where('date','==', dateStr));
  const snap = await L.getDocs(q);
  const taken = new Set(snap.docs.map(d => d.data().time));
  baseSlots.forEach(s => {
    const disabled = taken.has(s) ? 'disabled' : '';
    const label = taken.has(s) ? `${s} — taken` : s;
    timePicker.insertAdjacentHTML('beforeend', `<option value="${s}" ${disabled}>${label}</option>`);
  });
}
datePicker.addEventListener('change', e => loadAvailableTimes(e.target.value));
loadAvailableTimes();

// ---------- BOOKING ----------
const bookingForm = document.getElementById('bookingForm');
const bookingMsg = document.getElementById('bookingMsg');

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  bookingMsg.textContent = 'Saving…';

  const data = Object.fromEntries(new FormData(bookingForm));
  const date = data.date, time = data.time;
  // Prevent double-booking with a quick check
  const q = L.query(L.collection(db,'bookings'),
                   L.where('date','==',date),
                   L.where('time','==',time));
  const snap = await L.getDocs(q);
  if(!snap.empty){
    bookingMsg.textContent = 'That time was just booked. Please pick another slot.';
    await loadAvailableTimes(date);
    return;
  }

  // Upload inspiration image if present
  let inspoURL = '';
  const fileEl = document.getElementById('inspo');
  const file = fileEl.files?.[0];
  if(file){
    const r = L.ref(storage, `inspo/${Date.now()}_${file.name}`);
    await L.uploadBytes(r, file);
    inspoURL = await L.getDownloadURL(r);
  }

  await L.addDoc(L.collection(db,'bookings'), {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    service: data.service,
    date, time,
    inspoURL,
    createdAt: L.serverTimestamp(),
    status: 'booked'
  });

  bookingMsg.textContent = 'Booked! You’ll receive a confirmation. (Please note deposit & policies.)';
  bookingForm.reset();
  await loadAvailableTimes(date);
});

// ---------- SPECIALS (public) ----------
const specialsList = document.getElementById('specialsList');
async function renderSpecials(){
  const docRef = L.doc(db, 'content', 'specials');
  const d = await L.getDoc(docRef);
  specialsList.textContent = d.exists() && d.data().text ? d.data().text : 'No specials at the moment.';
}
renderSpecials();

// ---------- GALLERY (public) ----------
const galleryGrid = document.getElementById('galleryGrid');
function figTpl(img, cap){
  return `<figure>
    <img src="${img}" alt="">
    <figcaption>${cap || ''}</figcaption>
  </figure>`;
}
L.onSnapshot(L.query(L.collection(db,'gallery'), L.orderBy('createdAt','desc')), (snap)=>{
  galleryGrid.innerHTML = '';
  snap.forEach(doc => {
    const g = doc.data();
    galleryGrid.insertAdjacentHTML('beforeend', figTpl(g.url, g.caption));
  });
});

// ---------- OWNER / ADMIN ----------
const adminBtn = document.getElementById('adminBtn');
const adminSection = document.getElementById('admin');
const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const ownerArea = document.getElementById('ownerArea');
const ownerEmail = document.getElementById('ownerEmail');
const logoutBtn = document.getElementById('logoutBtn');

adminBtn.addEventListener('click', () => adminSection.classList.toggle('hidden'));

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  loginMsg.textContent = 'Signing in…';
  const fd = new FormData(loginForm);
  try{
    await L.signInWithEmailAndPassword(auth, fd.get('email'), fd.get('password'));
    loginMsg.textContent = '';
  }catch(err){
    loginMsg.textContent = err.message;
  }
});

logoutBtn.addEventListener('click', ()=> L.signOut(auth));

L.onAuthStateChanged(auth, (user)=>{
  if(user){
    ownerEmail.textContent = user.email;
    ownerArea.classList.remove('hidden');
    loginForm.parentElement.classList.add('hidden');
    hydrateBookings();
    // load specials text into form
    preloadSpecials();
  }else{
    ownerArea.classList.add('hidden');
    loginForm.parentElement.classList.remove('hidden');
  }
});

// Owner: bookings table live
const bookingsTable = document.getElementById('bookingsTable');
function rowTpl(b){
  return `<div class="row">
    <div>${b.firstName} ${b.lastName}</div>
    <div>${b.service}</div>
    <div>${b.date}</div>
    <div>${b.time}</div>
  </div>`;
}
function hydrateBookings(){
  const q = L.query(L.collection(db,'bookings'), L.orderBy('date'), L.orderBy('time'));
  L.onSnapshot(q, (snap)=>{
    bookingsTable.innerHTML = '';
    snap.forEach(doc => bookingsTable.insertAdjacentHTML('beforeend', rowTpl(doc.data())));
  });
}

// Owner: upload gallery
const galleryForm = document.getElementById('galleryForm');
const galleryMsg = document.getElementById('galleryMsg');
galleryForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  galleryMsg.textContent = 'Uploading…';
  const file = document.getElementById('galleryFile').files[0];
  const caption = document.getElementById('galleryCaption').value.trim();
  try{
    const r = L.ref(storage, `gallery/${Date.now()}_${file.name}`);
    await L.uploadBytes(r, file);
    const url = await L.getDownloadURL(r);
    await L.addDoc(L.collection(db,'gallery'), { url, caption, createdAt: L.serverTimestamp() });
    galleryMsg.textContent = 'Added to gallery!';
    galleryForm.reset();
  }catch(err){
    galleryMsg.textContent = err.message;
  }
});

// Owner: specials
const specialsForm = document.getElementById('specialsForm');
const specialsMsg = document.getElementById('specialsMsg');
async function preloadSpecials(){
  const ref = L.doc(db,'content','specials');
  const d = await L.getDoc(ref);
  document.getElementById('specialsText').value = d.exists() ? (d.data().text || '') : '';
}
specialsForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  specialsMsg.textContent = 'Saving…';
  const text = document.getElementById('specialsText').value.trim();
  try{
    await L.setDoc(L.doc(db,'content','specials'), { text, updatedAt: L.serverTimestamp() });
    specialsMsg.textContent = 'Published!';
    renderSpecials();
  }catch(err){
    specialsMsg.textContent = err.message;
  }
});
