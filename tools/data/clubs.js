// The student clubs of a fictional university, autumn semester 2026 (weeks 1-10, 7 Sep - 13 Nov).
// Seeded random data with one planted story ("The Friday Problem"), checked in checks.js.
//
// The story: in week 5 the computer lab's Thursday evening goes to an exam course, so the Coding Club's lab
// events move to Friday 18:30. People still sign up for them, but fewer than half turn up. Most of those
// Friday events are workshops, so workshops LOOK unpopular. Every other club sees the same Friday drop.
//
// The random generator is shared: don't reorder the calls below, or every number changes.
let seed = 42;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const START = new Date("2026-09-07T00:00:00Z"); // Monday of week 1
const dateOf = (week, day) => {
  const d = new Date(START);
  d.setUTCDate(d.getUTCDate() + (week - 1) * 7 + DAYS.indexOf(day));
  return d.toISOString().slice(0, 10);
};
const weekOf = (date) => Math.floor((new Date(date) - START) / 864e5 / 7) + 1;

function build() {
  seed = 42;
  const clubs = [
    ["C01", "Coding Club", "Tech", 142], ["C02", "Film Society", "Arts", 96], ["C03", "Hiking Club", "Sports", 118],
    ["C04", "Debate Society", "Academic", 64], ["C05", "Robotics Team", "Tech", 51], ["C06", "Photography Club", "Arts", 88],
    ["C07", "Salsa Club", "Sports", 73], ["C08", "Entrepreneurs Club", "Career", 109]
  ].map(([club_id, name, category, members]) => ({ club_id, name, category, members }));

  const rooms = [
    ["R-M201", "Main Building", "M201 Lecture room", 80, "Lecture"], ["R-M105", "Main Building", "M105 Computer lab", 40, "Lab"],
    ["R-M310", "Main Building", "M310 Seminar room", 40, "Seminar"], ["R-L002", "Library", "L002 Event space", 60, "Event"],
    ["R-S110", "Student Union", "S110 Hall", 120, "Hall"], ["R-S204", "Student Union", "S204 Meeting room", 30, "Seminar"],
    ["R-G001", "Sports Centre", "G001 Studio", 50, "Studio"], ["R-A120", "Arts Building", "A120 Screening room", 70, "Lecture"]
  ].map(([room_id, building, name, capacity, type]) => ({ room_id, building, name, capacity, type }));
  const room = (id) => rooms.find((r) => r.room_id === id);

  const organisers = { C01: ["Linh Pham", "Jonas Becker"], C02: ["Ana Ruiz"], C03: ["Tom Hale"], C04: ["Priya Nair"], C05: ["Minh Do"], C06: ["Sara Kim"], C07: ["Leo Costa"], C08: ["Nora Weiss"] };
  const titles = {
    Workshop: ["Git basics", "Build a web app in 90 min", "Intro to Python", "APIs with JavaScript", "SQL for beginners", "Docker in an hour", "Hack your CV site", "Unit testing 101", "Debugging like a pro", "React crash course"],
    Talk: ["Life as a junior dev", "How startups hire", "Open source 101", "AI in practice", "From intern to engineer"],
    Social: ["Welcome drinks", "Board game night", "Pizza & projects", "Quiz night", "Gaming night"]
  };

  const events = [], attendance = [], feedback = [];
  let n = 0;
  function addEvent(club_id, week, day, start_time, topic, room_id, title, organiser) {
    const event_id = "E" + String(++n).padStart(3, "0"), cap = room(room_id).capacity;
    events.push({ event_id, club_id, title, topic, date: dateOf(week, day), weekday: day, start_time, room_id, capacity: cap, organiser });
    // People sign up equally well for every slot. On Friday evenings far fewer turn up.
    const regRate = 0.84 + rnd() * 0.14;
    const wanted = Math.round(cap * regRate) + (rnd() < 0.4 ? ri(1, 9) : 0);
    const registered = Math.min(cap, wanted); // confirmed seats; the rest go on the waitlist
    const showRate = day === "Fri" && start_time >= "17:00" ? 0.38 + rnd() * 0.1 : 0.78 + rnd() * 0.12;
    const checked_in = Math.round(registered * showRate);
    attendance.push({ event_id, registered, waitlisted: Math.max(0, wanted - cap), checked_in });
    // Workshops get the best ratings: the topic is not the problem.
    const base = { Workshop: 4.5, Talk: 4.1, Social: 4.0, Competition: 4.2, Screening: 4.1, Trip: 4.4, Class: 4.3, Meetup: 3.9 }[topic] || 4;
    feedback.push({ event_id, responses: Math.max(3, Math.round(checked_in * (0.3 + rnd() * 0.2))), avg_rating: +(base + (rnd() - 0.5) * 0.3).toFixed(1) });
  }

  // Coding Club: a Wednesday event in M201 every week, plus a lab event in M105.
  // Weeks 1-4 the lab event is on Thursday. From week 5 the lab's Thursday goes to an exam course: Friday 18:30.
  const wed = ["Talk", "Social", "Talk", "Social", /* week 5 */ "Talk", "Workshop", "Workshop", "Talk", "Social", "Talk"];
  const late = { 5: "Workshop", 6: "Workshop", 7: "Social", 8: "Workshop", 9: "Workshop", 10: "Workshop" };
  const used = { Workshop: 0, Talk: 0, Social: 0 };
  const nextTitle = (tp) => titles[tp][used[tp]++ % titles[tp].length];
  for (let w = 1; w <= 10; w++) {
    addEvent("C01", w, "Wed", "18:00", wed[w - 1], "R-M201", nextTitle(wed[w - 1]), w % 2 ? "Linh Pham" : "Jonas Becker");
    if (w <= 4) addEvent("C01", w, "Thu", "18:00", "Workshop", "R-M105", nextTitle("Workshop"), "Jonas Becker");
    else addEvent("C01", w, "Fri", "18:30", late[w], "R-M105", nextTitle(late[w]), "Jonas Becker");
  }
  // The other clubs: one event a week, on rotating days (some on Friday evening).
  const other = {
    C02: ["Screening", "R-A120", ["Mon", "Thu", "Fri"]], C03: ["Trip", "R-L002", ["Tue", "Fri"]], C04: ["Competition", "R-M310", ["Mon", "Wed"]],
    C05: ["Workshop", "R-M310", ["Tue", "Fri"]], C06: ["Workshop", "R-L002", ["Wed", "Thu", "Fri"]], C07: ["Class", "R-G001", ["Mon", "Tue", "Thu", "Fri"]], C08: ["Talk", "R-S110", ["Tue", "Thu", "Fri"]]
  };
  for (const [club_id, [topic, room_id, days]] of Object.entries(other)) {
    for (let w = 1; w <= 10; w++) {
      const d = days[(w + club_id.charCodeAt(2)) % days.length];
      addEvent(club_id, w, d, pick(["17:30", "18:00", "18:30", "19:00"]), topic, room_id, `${topic} #${w}`, organisers[club_id][0]);
    }
  }
  events.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));

  // Promotion: 2-4 posts per event. The Coding Club stops posting on Instagram from week 7 (reach drops, sign-ups don't).
  const promotion_posts = [];
  let p = 0;
  for (const e of events) {
    let ch = ["Instagram", "Discord", "Email"];
    if (e.club_id === "C01" && weekOf(e.date) >= 7) ch = ["Discord", "Email"];
    if (rnd() < 0.3) ch = [...ch, "Poster"];
    for (const c of ch) {
      const reach = { Instagram: ri(380, 720), Discord: ri(90, 160), Email: ri(120, 140), Poster: ri(40, 120) }[c];
      const d = new Date(e.date);
      d.setUTCDate(d.getUTCDate() - ri(2, 6));
      promotion_posts.push({ post_id: "P" + String(++p).padStart(4, "0"), event_id: e.event_id, channel: c, posted_at: d.toISOString().slice(0, 10), reach, clicks: Math.round(reach * (0.06 + rnd() * 0.06)) });
    }
  }
  // Next semester's room bookings (for the recommendation: the lab is free on Tuesday).
  const room_bookings = [
    ["B01", "R-M105", "Mon", "17:00", "19:00", "Exam prep: Statistics"], ["B02", "R-M105", "Wed", "17:00", "20:00", "Exam prep: Programming"],
    ["B03", "R-M105", "Thu", "17:00", "20:00", "Exam prep: Databases"], ["B04", "R-M310", "Tue", "18:00", "20:00", "Robotics Team"],
    ["B05", "R-M201", "Wed", "18:00", "20:00", "Coding Club"], ["B06", "R-L002", "Tue", "18:00", "20:00", "Hiking Club"]
  ].map(([booking_id, room_id, weekday, start_time, end_time, booked_by]) => ({ booking_id, room_id, weekday, start_time, end_time, booked_by }));

  // ---- The tables teams get: one events table with sign-ups, check-ins and the rating precomputed,
  // so the core of the case needs no JOIN and no SUM()/SUM().
  const A = Object.fromEntries(attendance.map((a) => [a.event_id, a]));
  const F = Object.fromEntries(feedback.map((f) => [f.event_id, f]));
  const short = (roomId) => room(roomId).name.split(" ")[0];
  return {
    events: events.map((e) => {
      const a = A[e.event_id];
      return {
        event_id: e.event_id, club_id: e.club_id, title: e.title, topic: e.topic, week: weekOf(e.date), date: e.date, weekday: e.weekday, start_time: e.start_time,
        room: short(e.room_id), capacity: e.capacity, registered: a.registered, checked_in: a.checked_in,
        showup_pct: Math.round(100 * a.checked_in / a.registered), fill_pct: Math.round(100 * a.checked_in / e.capacity),
        avg_rating: F[e.event_id].avg_rating, organiser: e.organiser
      };
    }),
    clubs: clubs.map((c) => Object.assign({}, c, { sponsor: c.club_id === "C01" ? "Quillmoor Software (EUR 800, workshops)" : null })),
    promotion_posts: promotion_posts.map(({ post_id, event_id, channel, posted_at, reach }) => ({ post_id, event_id, channel, posted_at, reach })),
    room_bookings: room_bookings.map(({ booking_id, room_id, weekday, start_time, end_time, booked_by }) => ({ booking_id, room: short(room_id), weekday, start_time, end_time, booked_by }))
  };
}

module.exports = { build, weekOf };
