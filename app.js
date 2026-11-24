const STORAGE_KEY = "labspace-data-v1";
const PROFILE_KEY = "labspace-profile-v1";
const DEFAULT_PROFILE = { name: "Researcher", role: "Researcher" };
const startupWarnings = [];

const equipmentSeed = [
  { id: "confocal", name: "Confocal Microscope", category: "Microscopy", icon: "🔬", art: "art-blue", detail: "Laser-scanning fluorescence imaging", location: "Microscopy suite · set room", maxBookingHours: 2, trainingRequired: true, accessNotes: "Trained users only. Follow the microscope SOP and clean immersion lenses after use." },
  { id: "centrifuge", name: "Ultracentrifuge", category: "Sample preparation", icon: "◉", art: "art-mint", detail: "High-speed separation for prepared sample tubes", location: "Sample preparation lab · set room", maxBookingHours: 2, trainingRequired: true, accessNotes: "Rotor-specific training required. Balance tubes and inspect the rotor before each run." },
  { id: "spectrometer", name: "Mass Spectrometer", category: "Analytical chemistry", icon: "⌁", art: "art-lilac", detail: "Mass analysis of prepared samples", location: "Analytical facility · set room", maxBookingHours: 2, trainingRequired: true, accessNotes: "Confirm sample preparation and instrument method with the facility operator before booking." },
  { id: "pcr", name: "PCR Thermal Cycler", category: "Molecular biology", icon: "▥", art: "art-peach", detail: "Programmable thermal cycling for PCR protocols", location: "Molecular biology lab · set room", maxBookingHours: 4, trainingRequired: false, accessNotes: "Bring prepared, labelled plates or tubes; observe the lab's contamination-control procedure." },
  { id: "flow", name: "Flow Cytometer", category: "Cell analysis", icon: "✣", art: "art-mint", detail: "Fluorescence-based single-cell analysis", location: "Cell analysis facility · set room", maxBookingHours: 2, trainingRequired: true, accessNotes: "Instrument training and an approved sample-preparation protocol are required." },
  { id: "plate", name: "Microplate Reader", category: "Analytical chemistry", icon: "▦", art: "art-blue", detail: "Absorbance, fluorescence, and luminescence plate assays", location: "Analytical lab · set room", maxBookingHours: 2, trainingRequired: false, accessNotes: "Check plate compatibility and the assay read mode before starting a run." },
  { id: "chromatography", name: "HPLC System", category: "Separation science", icon: "⌁", art: "art-peach", detail: "High-performance liquid chromatography", location: "Chemistry lab · set room", maxBookingHours: 3, trainingRequired: true, accessNotes: "Operator approval and training required. Confirm column, mobile phase, and waste handling." },
  { id: "incubator", name: "CO₂ Incubator", category: "Cell culture", icon: "▣", art: "art-lilac", detail: "Controlled-temperature and CO₂ cell culture environment", location: "Cell culture suite · set room", maxBookingHours: 1, trainingRequired: false, accessNotes: "Shared facility equipment: coordinate access with the lab manager and minimize door-open time." }
];

const todayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
function initialData() {
  return {
    equipment: equipmentSeed.map((item) => ({ ...item })),
    bookings: [],
    maintenance: []
  };
}
function normalizeEquipment(item) {
  const seed = equipmentSeed.find((entry) => entry.id === item.id);
  const legacyDetails = {
    confocal: ["Zeiss LSM 900 · Cell imaging", "Imaging suite · B214"],
    centrifuge: ["Beckman Coulter · 100,000 rpm", "Prep lab · B108"],
    spectrometer: ["Thermo Q Exactive · LC-MS", "Analytical lab · C302"],
    pcr: ["Bio-Rad C1000 · 96-well", "Molecular lab · A116"],
    flow: ["BD FACSCanto II · 3 lasers", "Cell lab · B220"],
    plate: ["SpectraMax iD5 · Multi-mode", "Analytical lab · C305"],
    chromatography: ["Agilent 1260 Infinity II", "Chemistry lab · C110"],
    incubator: ["Thermo Heracell VIOS · 160 L", "Cell culture · B201"]
  };
  const legacy = legacyDetails[item.id];
  const isUneditedStarterItem = seed && legacy && item.detail === legacy[0] && item.location === legacy[1];
  return {
    ...item,
    ...(isUneditedStarterItem ? { detail: seed.detail, location: seed.location } : {}),
    maxBookingHours: Number.isInteger(item.maxBookingHours) && item.maxBookingHours > 0 ? item.maxBookingHours : seed?.maxBookingHours || 4,
    trainingRequired: typeof item.trainingRequired === "boolean" ? item.trainingRequired : seed?.trainingRequired || false,
    accessNotes: typeof item.accessNotes === "string" ? item.accessNotes : seed?.accessNotes || "Check local operating procedures before use."
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialData();
    const parsed = JSON.parse(saved);
    const validationError = validateBackup({ format: "labspace-backup", version: 1, profile: DEFAULT_PROFILE, data: parsed });
    if (validationError) throw new Error(validationError);
    parsed.equipment = parsed.equipment.map(normalizeEquipment);
    return parsed;
  } catch (error) {
    console.error("Could not load Labspace data:", error);
    startupWarnings.push("Saved workspace data could not be loaded. Started with the default catalogue; import a backup to recover data.");
    return initialData();
  }
}

let data = loadData();
let profileConfigured = false;
let profile = loadProfile();
let activeView = "overview";
let toastTimer;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Could not save Labspace data:", error);
    showToast("Your changes could not be saved in this browser.", true);
    return false;
  }
}

function loadProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (!saved) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(saved);
    if (typeof parsed?.name !== "string" || typeof parsed?.role !== "string") throw new Error("Saved profile has an unexpected format.");
    profileConfigured = true;
    return { name: parsed.name.trim() || DEFAULT_PROFILE.name, role: parsed.role.trim() || DEFAULT_PROFILE.role };
  } catch (error) {
    console.error("Could not load Labspace profile:", error);
    startupWarnings.push("Saved profile could not be loaded. Update your local profile to continue.");
    return { ...DEFAULT_PROFILE };
  }
}
function saveProfile() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    profileConfigured = true;
    return true;
  } catch (error) {
    console.error("Could not save Labspace profile:", error);
    showToast("Your profile could not be saved in this browser.", true);
    return false;
  }
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "U";
}
function renderProfile() {
  const firstName = profile.name.trim().split(/\s+/)[0] || "Researcher";
  $("#welcomeName").textContent = firstName;
  $$(".avatar-user, .avatar-top").forEach((avatar) => { avatar.textContent = initials(profile.name); });
  $$(".user-meta strong, .topbar-user strong").forEach((name) => { name.textContent = profile.name; });
  $$(".user-meta span, .topbar-user span").forEach((role) => { role.textContent = `${profile.role} · This browser`; });
}
function equipmentFor(id) {
  return data.equipment.find((item) => item.id === id);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function dateLabel(date, options = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);
}
function timeLabel(time) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}
function durationLabel(start, end) {
  const minutes = toMinutes(end) - toMinutes(start);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours} hr${hours === 1 ? "" : "s"}` : "", remainder ? `${remainder} min` : ""].filter(Boolean).join(" ");
}
function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
function isPastStart(date, time) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return date === todayISO() && time < currentTime;
}
function isPastEnd(date, time) {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return date < todayISO() || (date === todayISO() && time <= currentTime);
}
function isUpcoming(item) {
  return item.date >= todayISO() && (item.status === "approved" || item.status === "pending");
}
function intervalsOverlap(startA, endA, startB, endB) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA);
}
function hasConflict(equipmentId, date, start, end, ignoreId = null) {
  const booking = data.bookings.find((item) => item.id !== ignoreId && item.equipmentId === equipmentId && item.date === date && ["approved", "pending"].includes(item.status) && intervalsOverlap(start, end, item.start, item.end));
  if (booking) return `This time overlaps ${booking.user}'s ${booking.status} booking (${timeLabel(booking.start)}–${timeLabel(booking.end)}).`;
  const maintenance = data.maintenance.find((item) => item.equipmentId === equipmentId && item.date === date && intervalsOverlap(start, end, item.start, item.end));
  if (maintenance) return `This equipment is scheduled for maintenance: ${maintenance.reason} (${timeLabel(maintenance.start)}–${timeLabel(maintenance.end)}).`;
  return "";
}
function getAvailability(item) {
  const today = todayISO();
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const maintenanceNow = data.maintenance.some((block) => block.equipmentId === item.id && block.date === today && nowTime >= block.start && nowTime < block.end);
  const bookedNow = data.bookings.some((booking) => booking.equipmentId === item.id && booking.date === today && ["approved", "pending"].includes(booking.status) && nowTime >= booking.start && nowTime < booking.end);
  return maintenanceNow ? "maintenance" : bookedNow ? "in use" : "available";
}
function showToast(message, error = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}
function setView(view) {
  if (view === "admin" && !document.body.classList.contains("admin-mode")) {
    showToast("Enable local admin controls to open the admin dashboard.", true);
    return;
  }
  activeView = view;
  $$(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === view));
  const activeLink = $(`.nav-link[data-view="${view}"]`);
  if (activeLink) {
    const label = activeLink.cloneNode(true);
    label.querySelectorAll(".nav-icon, .nav-count").forEach((element) => element.remove());
    $("#breadcrumbCurrent").textContent = label.textContent.trim();
  }
  $("#sidebar").classList.remove("open");
  renderAll();
}
function statusPill(status) {
  const label = status === "approved" ? "Approved" : status === "pending" ? "Pending review" : status === "completed" ? "Completed" : status === "cancelled" ? "Cancelled" : status === "rejected" ? "Declined" : status;
  return `<span class="status-pill ${escapeHTML(status)}">${label}</span>`;
}
function emptyState(title, message) {
  return `<div class="empty-state"><span>✳</span><strong>${title}</strong>${message}</div>`;
}
function bookingItem(booking, actions = false) {
  const item = equipmentFor(booking.equipmentId);
  if (!item) return "";
  let actionHTML = "";
  if (actions && booking.status === "pending" && document.body.classList.contains("admin-mode")) {
    actionHTML = `<div class="booking-actions"><button class="mini-action approve" data-decision="approved" data-id="${escapeHTML(booking.id)}">Approve</button><button class="mini-action reject" data-decision="rejected" data-id="${escapeHTML(booking.id)}">Decline</button></div>`;
  } else if (actions && booking.user === profile.name && (booking.status === "pending" || (booking.status === "approved" && !isPastStart(booking.date, booking.start)))) {
    actionHTML = `<div class="booking-actions"><button class="mini-action" data-cancel-booking="${escapeHTML(booking.id)}">Cancel request</button></div>`;
  }
  if (actions && booking.status === "approved" && isPastEnd(booking.date, booking.end) && (booking.user === profile.name || document.body.classList.contains("admin-mode"))) {
    actionHTML = `<div class="booking-actions"><button class="mini-action approve" data-complete-booking="${escapeHTML(booking.id)}">Mark complete</button></div>`;
  }
  return `<div class="booking-row">
    <div class="equipment-art ${escapeHTML(item.art)}" style="width:42px;height:42px;font-size:20px">${escapeHTML(item.icon)}</div>
    <div class="booking-row-copy"><strong>${escapeHTML(item.name)} ${statusPill(booking.status)}</strong><span>${escapeHTML(booking.user)} · ${dateLabel(booking.date)} · ${timeLabel(booking.start)}–${timeLabel(booking.end)}</span></div>
    <div class="booking-purpose">${escapeHTML(booking.purpose)}</div>${actionHTML}
  </div>`;
}

function renderOverview() {
  const mine = data.bookings.filter((booking) => booking.user === profile.name);
  const upcoming = mine.filter(isUpcoming).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const pending = mine.filter((booking) => booking.status === "pending").length;
  const available = data.equipment.filter((item) => getAvailability(item) === "available").length;
  $("#statUpcoming").textContent = upcoming.filter((booking) => booking.status === "approved").length;
  $("#statPending").textContent = pending;
  $("#statAvailable").textContent = available;
  $("#statTotal").textContent = data.equipment.length;
  $("#equipmentNavCount").textContent = data.equipment.length;
  const isAdmin = document.body.classList.contains("admin-mode");
  $("#requestNavCount").textContent = data.bookings.filter((booking) => booking.status === "pending" && (isAdmin || booking.user === profile.name)).length;

  const featured = data.equipment.filter((item) => item.active !== false).slice(0, 4);
  $("#featuredEquipment").innerHTML = featured.map((item) => `<button class="quick-equipment" data-book-equipment="${escapeHTML(item.id)}"><span class="equipment-art ${escapeHTML(item.art)}">${escapeHTML(item.icon)}</span><span class="quick-copy"><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.category)} · ${getAvailability(item)}</span></span><span class="quick-arrow">↗</span></button>`).join("");
  $("#upcomingList").innerHTML = upcoming.length ? upcoming.slice(0, 3).map((booking) => {
    const item = equipmentFor(booking.equipmentId);
    const day = new Date(`${booking.date}T12:00:00`);
    return `<div class="upcoming-item"><div class="date-block"><strong>${day.getDate()}</strong><span>${day.toLocaleDateString(undefined, { month: "short" })}</span></div><div class="upcoming-copy"><strong>${escapeHTML(item ? item.name : "Equipment")}</strong><span>${timeLabel(booking.start)} · ${booking.status === "pending" ? "Awaiting approval" : "Approved"}</span></div></div>`;
  }).join("") : emptyState("Nothing scheduled yet", "Your upcoming sessions will appear here.");
  const completed = mine.filter((booking) => booking.status === "completed").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  $("#activityRows").innerHTML = completed.length ? completed.map((booking) => renderTableRow(booking, false)).join("") : `<tr><td colspan="4">${emptyState("No recent activity", "Completed sessions will show up here.")}</td></tr>`;
}

function renderTableRow(booking, includeTime = true) {
  const item = equipmentFor(booking.equipmentId);
  if (!item) return "";
  return `<tr><td><span class="table-equipment"><span class="mini-art ${escapeHTML(item.art)}">${escapeHTML(item.icon)}</span>${escapeHTML(item.name)}</span></td><td>${dateLabel(booking.date)}</td>${includeTime ? `<td>${timeLabel(booking.start)}–${timeLabel(booking.end)}</td>` : ""}<td>${durationLabel(booking.start, booking.end)}</td><td>${statusPill(booking.status)}</td></tr>`;
}

function renderEquipment() {
  const search = ($("#equipmentSearch")?.value || "").trim().toLowerCase();
  const category = $("#categoryFilter")?.value || "all";
  const availability = $("#availabilityFilter")?.value || "all";
  const filtered = data.equipment.filter((item) => item.active !== false).filter((item) => {
    const matchesText = `${item.name} ${item.category} ${item.detail} ${item.location}`.toLowerCase().includes(search);
    const matchesCategory = category === "all" || item.category === category;
    const state = getAvailability(item);
    const matchesAvailability = availability === "all" || (availability === "maintenance" ? state === "maintenance" : state === "available");
    return matchesText && matchesCategory && matchesAvailability;
  });
  $("#equipmentGrid").innerHTML = filtered.length ? filtered.map((item) => {
    const state = getAvailability(item);
    const adminActions = document.body.classList.contains("admin-mode")
      ? `<button class="catalogue-action" data-edit-equipment="${escapeHTML(item.id)}">Edit</button><button class="catalogue-action remove" data-remove-equipment="${escapeHTML(item.id)}">Remove</button>`
      : "";
    return `<article class="equipment-card"><div class="equipment-card-top"><span class="equipment-art ${escapeHTML(item.art)}">${escapeHTML(item.icon)}</span><span class="availability-label ${state === "maintenance" ? "is-maintenance" : ""}">${state === "in use" ? "In use now" : state === "maintenance" ? "In maintenance" : "Available now"}</span></div><div class="equipment-card-body"><span class="category-label">${escapeHTML(item.category)}</span><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.detail)}<br>${escapeHTML(item.location)}</p><div class="equipment-meta"><span>Max session · ${item.maxBookingHours} hr${item.maxBookingHours === 1 ? "" : "s"}</span><span class="${item.trainingRequired ? "training-required" : ""}">${item.trainingRequired ? "Training required" : "Training not flagged"}</span></div><p class="equipment-access">${escapeHTML(item.accessNotes)}</p><div class="equipment-card-bottom"><span>Booking required</span><button data-book-equipment="${escapeHTML(item.id)}">Book equipment ↗</button></div></div>${document.body.classList.contains("admin-mode") ? `<div class="equipment-admin-actions">${adminActions}</div>` : ""}</article>`;
  }).join("") : emptyState("No equipment found", "Try adjusting your search or filters.");
}

function renderBookings() {
  const mine = data.bookings
    .filter((booking) => booking.user === profile.name && (
      booking.status === "pending" ||
      (booking.status === "approved" && (isUpcoming(booking) || isPastStart(booking.date, booking.start)))
    ))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  $("#myBookingsList").innerHTML = mine.length ? mine.map((booking) => bookingItem(booking, true)).join("") : emptyState("No active bookings", "Explore the equipment catalogue to request a time.");
  const isAdmin = document.body.classList.contains("admin-mode");
  const requests = data.bookings
    .filter((booking) => booking.status === "pending" && (isAdmin || booking.user === profile.name))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  $("#requestsList").innerHTML = requests.length ? requests.map((booking) => bookingItem(booking, true)).join("") : emptyState("All caught up", "There are no requests waiting for approval.");
  $("#requestTotal").textContent = `${requests.length} request${requests.length === 1 ? "" : "s"}`;
}

function renderHistory() {
  const isAdmin = document.body.classList.contains("admin-mode");
  const history = data.bookings
    .filter((booking) => ["completed", "cancelled", "rejected"].includes(booking.status) && (isAdmin || booking.user === profile.name))
    .sort((a, b) => b.date.localeCompare(a.date));
  $("#historyRows").innerHTML = history.length ? history.map((booking) => renderTableRow(booking, true)).join("") : `<tr><td colspan="5">${emptyState("No sessions yet", "Your completed or cancelled bookings will appear here.")}</td></tr>`;
}

function renderMaintenance() {
  const windows = [...data.maintenance].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  $("#maintenanceList").innerHTML = windows.length ? windows.map((block) => {
    const item = equipmentFor(block.equipmentId);
    if (!item) return "";
    return `<div class="booking-row">    <div class="equipment-art ${escapeHTML(item.art)}" style="width:42px;height:42px;font-size:20px">${escapeHTML(item.icon)}</div><div class="booking-row-copy"><strong>${escapeHTML(item.name)} ${statusPill("maintenance")}</strong><span>${dateLabel(block.date)} · ${timeLabel(block.start)}–${timeLabel(block.end)}</span></div><div class="booking-purpose">${escapeHTML(block.reason)}</div>${document.body.classList.contains("admin-mode") ? `<div class="booking-actions"><button class="mini-action reject" data-remove-maintenance="${escapeHTML(block.id)}">Remove</button></div>` : ""}</div>`;
  }).join("") : emptyState("No maintenance scheduled", "Planned service windows will appear here.");
}

function renderAdmin() {
  if (!document.body.classList.contains("admin-mode")) {
    $("#adminEquipment").textContent = "—";
    $("#adminPending").textContent = "—";
    $("#adminMaintenance").textContent = "—";
    $("#adminRequestList").innerHTML = emptyState("Local admin controls are off", "Enable the local admin switch to review lab operations.");
    return;
  }
  const pending = data.bookings.filter((booking) => booking.status === "pending").sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  $("#adminEquipment").textContent = data.equipment.filter((item) => item.active !== false).length;
  $("#adminPending").textContent = pending.length;
  $("#adminMaintenance").textContent = data.maintenance.length;
  $("#adminRequestList").innerHTML = pending.length ? pending.slice(0, 5).map((booking) => bookingItem(booking, true)).join("") : emptyState("No pending requests", "New booking requests will appear here.");
}

function renderAvailability() {
  const equipmentId = $("#bookingEquipment").value;
  const date = $("#bookingDate").value;
  const item = equipmentFor(equipmentId);
  $("#availabilityDateLabel").textContent = date ? dateLabel(date, { weekday: "short", month: "short", day: "numeric" }) : "Choose a date";
  if (!item || !date) {
    $("#availabilitySlots").innerHTML = `<p class="availability-caption">Choose equipment and a date to see open times.</p>`;
    $("#availabilitySchedule").innerHTML = "";
    return;
  }

  const blocks = [
    ...data.bookings
      .filter((booking) => booking.equipmentId === equipmentId && booking.date === date && ["approved", "pending"].includes(booking.status))
      .map((booking) => ({ start: booking.start, end: booking.end, label: `${booking.status === "pending" ? "Pending" : "Booked"} · ${booking.user}`, reason: booking.purpose, kind: "booking" })),
    ...data.maintenance
      .filter((block) => block.equipmentId === equipmentId && block.date === date)
      .map((block) => ({ start: block.start, end: block.end, label: "Maintenance", reason: block.reason, kind: "maintenance" }))
  ].sort((a, b) => a.start.localeCompare(b.start));

  const starts = [];
  for (let hour = 8; hour < 18; hour += 1) {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String(hour + 1).padStart(2, "0")}:00`;
    if (!isPastStart(date, start) && !hasConflict(equipmentId, date, start, end)) starts.push(start);
  }
  const shownSlots = starts.slice(0, 6);
  $("#availabilitySlots").innerHTML = `<p class="availability-caption">Suggested one-hour slots · 8:00 AM–6:00 PM</p>${shownSlots.length ? `<div class="availability-slot-list">${shownSlots.map((start) => `<button type="button" class="availability-slot" data-slot-start="${start}">${timeLabel(start)}</button>`).join("")}</div>` : `<p class="availability-caption">No suggested slots are open. Try another date or adjust the time.</p>`}`;
  $("#availabilitySchedule").innerHTML = blocks.length
    ? blocks.map((block) => `<span class="availability-schedule ${block.kind === "maintenance" ? "maintenance-text" : ""}"><strong>${escapeHTML(block.label)}</strong> ${timeLabel(block.start)}–${timeLabel(block.end)} · ${escapeHTML(block.reason)}</span>`).join("")
    : `<div class="availability-schedule">No existing reservations or maintenance on this date.</div>`;
}

function renderBookingPolicy() {
  const item = equipmentFor($("#bookingEquipment").value);
  const confirmation = $("#trainingConfirmation");
  if (!item) {
    $("#bookingPolicy").textContent = "";
    confirmation.hidden = true;
    $("#trainingAcknowledged").required = false;
    return;
  }
  $("#bookingPolicy").innerHTML = `<strong>Session limit: ${item.maxBookingHours} hour${item.maxBookingHours === 1 ? "" : "s"}.</strong> ${escapeHTML(item.accessNotes)}${item.trainingRequired ? " Training confirmation is self-reported and is not verified by this local app." : ""}`;
  confirmation.hidden = !item.trainingRequired;
  $("#trainingAcknowledged").required = false;
  if (!item.trainingRequired) $("#trainingAcknowledged").checked = false;
}

function renderNotifications() {
  const upcoming = data.bookings
    .filter((booking) => booking.user === profile.name && isUpcoming(booking))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const pendingCount = upcoming.filter((booking) => booking.status === "pending").length;
  const badge = $("#notificationCount");
  badge.hidden = pendingCount === 0;
  badge.textContent = pendingCount > 9 ? "9+" : String(pendingCount);
  $("#notificationSummary").textContent = pendingCount ? `${pendingCount} awaiting review` : "You're all caught up";
  $("#notificationList").innerHTML = upcoming.length
    ? upcoming.slice(0, 5).map((booking) => {
      const item = equipmentFor(booking.equipmentId);
      if (!item) return "";
      const isPending = booking.status === "pending";
      return `<button type="button" class="notification-item" data-notification-view="${isPending ? "bookings" : "bookings"}"><span class="notification-dot ${isPending ? "" : "approved"}"></span><span><strong>${isPending ? "Request awaiting approval" : "Upcoming equipment session"}</strong><span>${escapeHTML(item.name)} · ${dateLabel(booking.date)} at ${timeLabel(booking.start)}</span></span></button>`;
    }).join("")
    : emptyState("No new notifications", "Booking updates will appear here.");
}

function renderAll() {
  renderProfile();
  renderOverview();
  renderEquipment();
  renderBookings();
  renderHistory();
  renderMaintenance();
  renderAdmin();
  renderNotifications();
}

function populateSelects() {
  const activeEquipment = data.equipment.filter((item) => item.active !== false);
  const categories = [...new Set(activeEquipment.map((item) => item.category))].sort();
  const categoryFilter = $("#categoryFilter");
  const currentCategory = categoryFilter.value;
  categoryFilter.innerHTML = `<option value="all">All categories</option>${categories.map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("")}`;
  categoryFilter.value = categories.includes(currentCategory) ? currentCategory : "all";
  const options = activeEquipment.map((item) => `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`).join("");
  $("#bookingEquipment").innerHTML = options;
  $("#maintenanceEquipment").innerHTML = options;
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  const focusable = modal.querySelector("select, input");
  if (focusable) focusable.focus();
}
function closeModals() {
  $$(".modal-backdrop.open").forEach((modal) => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  });
}
function startBooking(equipmentId) {
  $("#bookingForm").reset();
  if (equipmentId && equipmentFor(equipmentId)) $("#bookingEquipment").value = equipmentId;
  $("#bookingDate").value = todayISO();
  $("#bookingError").textContent = "";
  renderAvailability();
  renderBookingPolicy();
  openModal("bookingModal");
}

document.addEventListener("click", (event) => {
  const notificationsButton = event.target.closest("#notificationsButton");
  if (notificationsButton) {
    const popover = $("#notificationPopover");
    popover.hidden = !popover.hidden;
    notificationsButton.setAttribute("aria-expanded", String(!popover.hidden));
    return;
  }
  if (!event.target.closest(".notification-wrap")) {
    $("#notificationPopover").hidden = true;
    $("#notificationsButton").setAttribute("aria-expanded", "false");
  }
  const notification = event.target.closest("[data-notification-view]");
  if (notification) {
    $("#notificationPopover").hidden = true;
    $("#notificationsButton").setAttribute("aria-expanded", "false");
    setView(notification.dataset.notificationView);
    return;
  }
  const slot = event.target.closest("[data-slot-start]");
  if (slot) {
    const start = slot.dataset.slotStart;
    const end = `${String(Number(start.slice(0, 2)) + 1).padStart(2, "0")}:00`;
    $("#bookingForm [name='start']").value = start;
    $("#bookingForm [name='end']").value = end;
    return;
  }
  const nav = event.target.closest("[data-view]");
  if (nav) {
    setView(nav.dataset.view);
    return;
  }
  const navigate = event.target.closest("[data-navigate]");
  if (navigate) {
    setView(navigate.dataset.navigate);
    return;
  }
  if (event.target.closest("[data-open-booking]")) {
    startBooking();
    return;
  }
  const equipmentButton = event.target.closest("[data-book-equipment]");
  if (equipmentButton) {
    startBooking(equipmentButton.dataset.bookEquipment);
    return;
  }
  if (event.target.closest("[data-open-maintenance]")) {
    if (!document.body.classList.contains("admin-mode")) {
      showToast("Switch on Admin mode to schedule maintenance.", true);
      return;
    }
    $("#maintenanceDate").value = todayISO();
    $("#maintenanceError").textContent = "";
    openModal("maintenanceModal");
    return;
  }
  if (event.target.closest("[data-close-modal]") || event.target.classList.contains("modal-backdrop")) {
    closeModals();
    return;
  }
  const decision = event.target.closest("[data-decision]");
  if (decision) {
    const booking = data.bookings.find((item) => item.id === decision.dataset.id);
    if (!booking || booking.status !== "pending") return;
    if (decision.dataset.decision === "approved") {
      if (booking.date < todayISO() || isPastStart(booking.date, booking.start)) {
        showToast("This request is for a time that has already passed.", true);
        return;
      }
      const conflict = hasConflict(booking.equipmentId, booking.date, booking.start, booking.end, booking.id);
      if (conflict) {
        showToast(`Cannot approve: ${conflict}`, true);
        return;
      }
    }
    booking.status = decision.dataset.decision;
    if (saveData()) {
      renderAll();
      showToast(booking.status === "approved" ? "Booking approved." : "Request declined.");
    }
    return;
  }
  const cancel = event.target.closest("[data-cancel-booking]");
  if (cancel) {
    const booking = data.bookings.find((item) => item.id === cancel.dataset.cancelBooking);
    if (booking && booking.user === profile.name && (booking.status === "pending" || (booking.status === "approved" && !isPastStart(booking.date, booking.start)))) {
      if (!window.confirm("Cancel this booking? Its time will become available to other researchers.")) return;
      booking.status = "cancelled";
      if (saveData()) { renderAll(); showToast("Booking cancelled."); }
    }
    return;
  }
  const complete = event.target.closest("[data-complete-booking]");
  if (complete) {
    const booking = data.bookings.find((item) => item.id === complete.dataset.completeBooking);
    if (booking && booking.status === "approved" && isPastEnd(booking.date, booking.end) && (booking.user === profile.name || document.body.classList.contains("admin-mode"))) {
      booking.status = "completed";
      if (saveData()) { renderAll(); showToast("Session added to usage history."); }
    }
    return;
  }
  const editEquipment = event.target.closest("[data-edit-equipment]");
  if (editEquipment) {
    const item = equipmentFor(editEquipment.dataset.editEquipment);
    if (!item || !document.body.classList.contains("admin-mode")) return;
    const form = $("#equipmentForm");
    form.elements.id.value = item.id;
    form.elements.name.value = item.name;
    form.elements.category.value = item.category;
    form.elements.detail.value = item.detail;
    form.elements.location.value = item.location;
    form.elements.maxBookingHours.value = item.maxBookingHours;
    form.elements.trainingRequired.value = String(item.trainingRequired);
    form.elements.accessNotes.value = item.accessNotes;
    $("#equipmentModalTitle").textContent = "Edit equipment";
    $("#equipmentError").textContent = "";
    openModal("equipmentModal");
    return;
  }
  const removeEquipment = event.target.closest("[data-remove-equipment]");
  if (removeEquipment) {
    const item = equipmentFor(removeEquipment.dataset.removeEquipment);
    if (!item || !document.body.classList.contains("admin-mode")) return;
    const referenced = data.bookings.some((booking) => booking.equipmentId === item.id) || data.maintenance.some((block) => block.equipmentId === item.id);
    if (referenced) {
      showToast("This item has booking or usage history. Edit its name or keep it in the catalogue instead.", true);
      return;
    }
    if (!window.confirm(`Remove ${item.name} from the equipment catalogue?`)) return;
    data.equipment = data.equipment.filter((entry) => entry.id !== item.id);
    if (saveData()) { populateSelects(); renderAll(); showToast("Equipment removed from the catalogue."); }
    return;
  }
  const remove = event.target.closest("[data-remove-maintenance]");
  if (remove) {
    data.maintenance = data.maintenance.filter((item) => item.id !== remove.dataset.removeMaintenance);
    if (saveData()) { renderAll(); showToast("Maintenance window removed."); }
  }
});

$("#bookingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const booking = {
    id: `booking-${Date.now()}`,
    equipmentId: String(form.get("equipment")),
    user: profile.name,
    date: String(form.get("date")),
    start: String(form.get("start")),
    end: String(form.get("end")),
    purpose: String(form.get("purpose")).trim(),
    trainingConfirmed: $("#trainingAcknowledged").checked,
    status: "pending"
  };
  const error = $("#bookingError");
  if (!equipmentFor(booking.equipmentId)) { error.textContent = "Choose an equipment item from the catalogue."; return; }
  if (booking.date < todayISO()) { error.textContent = "Choose today or a future date."; return; }
  if (isPastStart(booking.date, booking.start)) { error.textContent = "Choose a start time that has not passed."; return; }
  if (toMinutes(booking.end) <= toMinutes(booking.start)) { error.textContent = "End time must be later than start time."; return; }
  const selectedEquipment = equipmentFor(booking.equipmentId);
  if (toMinutes(booking.end) - toMinutes(booking.start) > selectedEquipment.maxBookingHours * 60) { error.textContent = `This equipment has a ${selectedEquipment.maxBookingHours}-hour maximum session length.`; return; }
  if (selectedEquipment.trainingRequired && !$("#trainingAcknowledged").checked) { error.textContent = "Confirm that you have completed the required training before sending a request."; return; }
  const conflict = hasConflict(booking.equipmentId, booking.date, booking.start, booking.end);
  if (conflict) { error.textContent = conflict; return; }
  data.bookings.push(booking);
  if (saveData()) {
    closeModals();
    event.currentTarget.reset();
    setView(activeView);
    showToast("Request sent. Your time is held while it awaits review.");
  }
});

$("#maintenanceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!document.body.classList.contains("admin-mode")) {
    $("#maintenanceError").textContent = "Enable Admin mode before scheduling maintenance.";
    return;
  }
  const form = new FormData(event.currentTarget);
  const block = {
    id: `maint-${Date.now()}`,
    equipmentId: String(form.get("equipment")),
    date: String(form.get("date")),
    start: String(form.get("start")),
    end: String(form.get("end")),
    reason: String(form.get("reason")).trim()
  };
  const error = $("#maintenanceError");
  if (!equipmentFor(block.equipmentId)) { error.textContent = "Choose an equipment item from the catalogue."; return; }
  if (block.date < todayISO()) { error.textContent = "Choose today or a future date."; return; }
  if (isPastStart(block.date, block.start)) { error.textContent = "Choose a start time that has not passed."; return; }
  if (toMinutes(block.end) <= toMinutes(block.start)) { error.textContent = "End time must be later than start time."; return; }
  const conflict = hasConflict(block.equipmentId, block.date, block.start, block.end);
  if (conflict) { error.textContent = `Cannot block maintenance: ${conflict}`; return; }
  data.maintenance.push(block);
  if (saveData()) {
    closeModals();
    event.currentTarget.reset();
    renderAll();
    showToast("Maintenance window scheduled.");
  }
});

$("#profileButton").addEventListener("click", openProfile);
$("#profileTrigger").addEventListener("click", openProfile);
function openProfile() {
  $("#profileModalTitle").textContent = profileConfigured ? "Your profile" : "Set up your profile";
  $("#profileName").value = profile.name;
  $("#profileRole").value = profile.role;
  $("#profileError").textContent = "";
  openModal("profileModal");
}
$("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const nextName = String(form.get("name")).trim();
  const nextRole = String(form.get("role")).trim();
  if (!nextName || !nextRole) {
    $("#profileError").textContent = "Enter both your name and role.";
    return;
  }
  const previousProfile = profile;
  profile = { name: nextName, role: nextRole };
  if (saveProfile()) {
    closeModals();
    renderAll();
    showToast("Local profile updated.");
  } else {
    profile = previousProfile;
  }
});

document.querySelector("[data-open-equipment]").addEventListener("click", () => {
  if (!document.body.classList.contains("admin-mode")) {
    showToast("Switch on Admin mode to manage equipment.", true);
    return;
  }
  $("#equipmentForm").reset();
  $("#equipmentForm").elements.id.value = "";
  $("#equipmentModalTitle").textContent = "Add equipment";
  $("#equipmentError").textContent = "";
  openModal("equipmentModal");
});
$("#equipmentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!document.body.classList.contains("admin-mode")) {
    $("#equipmentError").textContent = "Enable Admin mode before editing the catalogue.";
    return;
  }
  const form = new FormData(event.currentTarget);
  const id = String(form.get("id"));
  const name = String(form.get("name")).trim();
  const category = String(form.get("category")).trim();
  const detail = String(form.get("detail")).trim();
  const location = String(form.get("location")).trim();
  const existing = id ? equipmentFor(id) : null;
  if (!name || !category || !detail || !location) {
    $("#equipmentError").textContent = "Complete each equipment field.";
    return;
  }
  if (!existing && data.equipment.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    $("#equipmentError").textContent = "An equipment item with this name already exists.";
    return;
  }
  if (existing && data.equipment.some((item) => item.id !== existing.id && item.name.toLowerCase() === name.toLowerCase())) {
    $("#equipmentError").textContent = "Another equipment item already uses this name.";
    return;
  }
  const maxBookingHours = Number(form.get("maxBookingHours"));
  if (!Number.isInteger(maxBookingHours) || maxBookingHours < 1 || maxBookingHours > 24) {
    $("#equipmentError").textContent = "Maximum session length must be between 1 and 24 hours.";
    return;
  }
  const trainingRequired = String(form.get("trainingRequired")) === "true";
  const accessNotes = String(form.get("accessNotes")).trim();
  if (!accessNotes) {
    $("#equipmentError").textContent = "Add local access rules or SOP reminders for this item.";
    return;
  }
  if (existing && data.bookings.some((booking) => booking.equipmentId === existing.id && ["pending", "approved"].includes(booking.status) && toMinutes(booking.end) - toMinutes(booking.start) > maxBookingHours * 60)) {
    $("#equipmentError").textContent = "This session limit is shorter than an existing active booking. Resolve those bookings first.";
    return;
  }
  const palettes = [["▦", "art-blue"], ["◉", "art-mint"], ["⌁", "art-lilac"], ["▥", "art-peach"]];
  const [icon, art] = existing ? [existing.icon, existing.art] : palettes[data.equipment.length % palettes.length];
  if (existing) Object.assign(existing, { name, category, detail, location, maxBookingHours, trainingRequired, accessNotes });
  else data.equipment.push({ id: `equipment-${Date.now()}`, name, category, detail, location, maxBookingHours, trainingRequired, accessNotes, icon, art });
  if (saveData()) {
    closeModals();
    populateSelects();
    renderAll();
    showToast(existing ? "Equipment details updated." : "Equipment added to the catalogue.");
  }
});

$("#equipmentSearch").addEventListener("input", renderEquipment);
$("#categoryFilter").addEventListener("change", renderEquipment);
$("#availabilityFilter").addEventListener("change", renderEquipment);
$("#bookingEquipment").addEventListener("change", () => {
  $("#trainingAcknowledged").checked = false;
  renderAvailability();
  renderBookingPolicy();
});
$("#bookingDate").addEventListener("change", renderAvailability);
$("#adminMode").addEventListener("change", (event) => {
  document.body.classList.toggle("admin-mode", event.target.checked);
  if (!event.target.checked && activeView === "admin") {
    setView("overview");
    showToast("Switched back to researcher view.");
    return;
  }
  renderAll();
  showToast(event.target.checked ? "Local admin controls enabled. This is not a secure sign-in." : "Switched back to researcher view.");
});
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#exportDataButton").addEventListener("click", () => {
  const backup = {
    format: "labspace-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    data
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `labspace-backup-${todayISO()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Workspace backup downloaded.");
});
$("#importDataButton").addEventListener("click", () => $("#importDataFile").click());
$("#importDataFile").addEventListener("change", async (event) => {
  const [file] = event.currentTarget.files;
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const validationError = validateBackup(backup);
    if (validationError) {
      showToast(validationError, true);
      return;
    }
    if (!window.confirm("Import this backup and replace the current local workspace data?")) return;
    const previousData = data;
    const previousProfile = profile;
    data = { ...backup.data, equipment: backup.data.equipment.map(normalizeEquipment) };
    profile = backup.profile;
    if (!saveData() || !saveProfile()) {
      data = previousData;
      profile = previousProfile;
      return;
    }
    populateSelects();
    renderAll();
    showToast("Workspace backup restored.");
  } catch (error) {
    console.error("Could not import Labspace backup:", error);
    showToast("The selected file could not be read as a Labspace backup.", true);
  } finally {
    event.currentTarget.value = "";
  }
});
function validateBackup(backup) {
  const validString = (value, max = 120) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
  const validDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day;
  };
  const validTime = (value) => /^\d{2}:\d{2}$/.test(value) && Number(value.slice(3)) < 60 && toMinutes(value) < 1440;
  if (!backup || backup.format !== "labspace-backup" || backup.version !== 1) return "This is not a supported Labspace backup.";
  if (!backup.profile || !validString(backup.profile.name, 60) || !validString(backup.profile.role, 40)) return "The backup profile is missing or invalid.";
  if (!backup.data || !Array.isArray(backup.data.equipment) || !Array.isArray(backup.data.bookings) || !Array.isArray(backup.data.maintenance)) return "The backup data is incomplete.";
  const equipmentIds = new Set();
  const allowedArt = new Set(["art-blue", "art-mint", "art-lilac", "art-peach"]);
  for (const item of backup.data.equipment) {
    if (!item || !validString(item.id, 80) || equipmentIds.has(item.id) || !validString(item.name, 70) || !validString(item.category, 40) || !validString(item.detail, 90) || !validString(item.location, 70) || !validString(item.icon, 8) || !allowedArt.has(item.art) || (item.maxBookingHours !== undefined && (!Number.isInteger(item.maxBookingHours) || item.maxBookingHours < 1 || item.maxBookingHours > 24)) || (item.trainingRequired !== undefined && typeof item.trainingRequired !== "boolean") || (item.accessNotes !== undefined && !validString(item.accessNotes, 240))) return "An equipment record in the backup is invalid.";
    equipmentIds.add(item.id);
  }
  const bookingIds = new Set();
  const allowedStatuses = new Set(["pending", "approved", "completed", "cancelled", "rejected"]);
  for (const booking of backup.data.bookings) {
    if (!booking || !validString(booking.id, 100) || bookingIds.has(booking.id) || !equipmentIds.has(booking.equipmentId) || !validString(booking.user, 60) || !validString(booking.purpose, 100) || !validDate(booking.date) || !validTime(booking.start) || !validTime(booking.end) || toMinutes(booking.end) <= toMinutes(booking.start) || !allowedStatuses.has(booking.status)) return "A booking record in the backup is invalid.";
    if (booking.trainingConfirmed !== undefined && typeof booking.trainingConfirmed !== "boolean") return "A booking training confirmation in the backup is invalid.";
    const equipment = backup.data.equipment.find((item) => item.id === booking.equipmentId);
    if (["pending", "approved"].includes(booking.status) && equipment.maxBookingHours && toMinutes(booking.end) - toMinutes(booking.start) > equipment.maxBookingHours * 60) return "A booking exceeds the equipment session limit.";
    bookingIds.add(booking.id);
  }
  for (const block of backup.data.maintenance) {
    if (!block || !validString(block.id, 100) || !equipmentIds.has(block.equipmentId) || !validString(block.reason, 100) || !validDate(block.date) || !validTime(block.start) || !validTime(block.end) || toMinutes(block.end) <= toMinutes(block.start)) return "A maintenance record in the backup is invalid.";
  }
  const reservations = backup.data.bookings.filter((booking) => ["pending", "approved"].includes(booking.status));
  for (let index = 0; index < reservations.length; index += 1) {
    const booking = reservations[index];
    if (reservations.slice(index + 1).some((other) => other.equipmentId === booking.equipmentId && other.date === booking.date && intervalsOverlap(booking.start, booking.end, other.start, other.end))) return "The backup contains overlapping active bookings.";
    if (backup.data.maintenance.some((block) => block.equipmentId === booking.equipmentId && block.date === booking.date && intervalsOverlap(booking.start, booking.end, block.start, block.end))) return "The backup contains a booking that overlaps maintenance.";
  }
  const maintenanceIds = new Set();
  for (let index = 0; index < backup.data.maintenance.length; index += 1) {
    const block = backup.data.maintenance[index];
    if (maintenanceIds.has(block.id)) return "The backup contains duplicate maintenance records.";
    maintenanceIds.add(block.id);
    if (backup.data.maintenance.slice(index + 1).some((other) => other.equipmentId === block.equipmentId && other.date === block.date && intervalsOverlap(block.start, block.end, other.start, other.end))) return "The backup contains overlapping maintenance windows.";
  }
  return "";
}
$("#resetWorkspaceButton").addEventListener("click", () => {
  if (!document.body.classList.contains("admin-mode")) {
    showToast("Switch on local admin controls to restore defaults.", true);
    return;
  }
  if (!window.confirm("Restore the default equipment catalogue and clear all bookings, history, maintenance, and profile settings?")) return;
  data = initialData();
  profile = { ...DEFAULT_PROFILE };
  profileConfigured = false;
  $("#adminMode").checked = false;
  document.body.classList.remove("admin-mode");
  $("#equipmentSearch").value = "";
  $("#availabilityFilter").value = "all";
  populateSelects();
  $("#bookingDate").min = todayISO();
  $("#maintenanceDate").min = todayISO();
  if (saveData() && saveProfile()) {
    setView("overview");
    showToast("Default workspace restored.");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModals();
    $("#sidebar").classList.remove("open");
    $("#notificationPopover").hidden = true;
    $("#notificationsButton").setAttribute("aria-expanded", "false");
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === PROFILE_KEY) {
    data = loadData();
    profile = loadProfile();
    populateSelects();
    renderAll();
  }
});

populateSelects();
$("#bookingDate").min = todayISO();
$("#maintenanceDate").min = todayISO();
renderAvailability();
renderAll();
if (!profileConfigured) {
  $("#profileModalTitle").textContent = "Set up your profile";
  $("#profileName").value = "";
  $("#profileRole").value = DEFAULT_PROFILE.role;
  openModal("profileModal");
}
if (startupWarnings.length) showToast(startupWarnings.join(" "), true);
