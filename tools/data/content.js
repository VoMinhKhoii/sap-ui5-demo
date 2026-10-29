const TABLES = {
  events: {
    title: "Club events", description: "Every event of the 8 clubs in the autumn semester 2026 (weeks 1-10). One row per event, with sign-ups, check-ins and the rating already worked out.",
    key: "event_id",
    fields: {
      event_id: "Event number",
      club_id: "The club that ran it (see clubs)",
      title: "Name of the event",
      topic: "Type of event. Coding Club: Workshop, Talk or Social. Other clubs have their own types",
      week: "Semester week, 1-10 (week 1 starts Mon 7 Sep 2026, week 5 on Mon 5 Oct)",
      date: "Date, YYYY-MM-DD",
      weekday: "Mon, Tue, Wed, Thu or Fri",
      start_time: "Start time, HH:MM",
      room: "Room code, e.g. M105 (the computer lab) or M201 (a lecture room)",
      capacity: "Seats in the room",
      registered: "People who signed up and got a seat",
      checked_in: "People who were scanned at the door",
      showup_pct: "checked_in ÷ registered, in %. Of the people who signed up, how many came?",
      fill_pct: "checked_in ÷ capacity, in %. How full was the room?",
      avg_rating: "Average feedback rating, 1 (bad) to 5 (great)",
      organiser: "Club member who ran the event"
    }
  },
  clubs: {
    title: "Student clubs", description: "The 8 student clubs.", key: "club_id",
    fields: {
      club_id: "Club number, e.g. C01 (the Coding Club)",
      name: "Club name",
      category: "Tech, Arts, Sports, Academic or Career",
      members: "Members this semester",
      sponsor: "Sponsor and what they pay for (empty if none)"
    }
  },
  promotion_posts: {
    title: "Promotion posts", description: "Every post that advertised an event: 2-4 per event, a few days before it.", key: "post_id",
    fields: {
      post_id: "Post number",
      event_id: "The event it advertised (see events)",
      channel: "Instagram, Discord, Email or Poster",
      posted_at: "Date of the post, YYYY-MM-DD",
      reach: "People who saw the post"
    }
  },
  room_bookings: {
    title: "Room bookings, next semester", description: "Weekly room bookings that are already fixed for NEXT semester (spring 2027). A room is free at any time not listed here.", key: "booking_id",
    fields: {
      booking_id: "Booking number",
      room: "Room code (same codes as events.room)",
      weekday: "Mon, Tue, Wed, Thu or Fri",
      start_time: "From, HH:MM",
      end_time: "Until, HH:MM",
      booked_by: "Who has the room"
    }
  }
};
const RELATIONS = [
  { from: "events", field: "club_id", to: "clubs", key: "club_id" },
  { from: "promotion_posts", field: "event_id", to: "events", key: "event_id" },
  { from: "room_bookings", field: "room", to: "events", key: "room", note: "same room code, not a key" }
];

const CASE = {
  id: "friday-problem",
  title: "The Friday Problem",
  client: "Coding Club president",
  today: "Monday 16 November 2026",
  deadline: "Sponsor renewal meeting, Friday 20 November",
  brief: "Since October, the Coding Club's events look half empty. The president wants to swap workshops for socials, and has to tell the sponsor who pays for the workshops by Friday.",
  story: [
    "The Coding Club has a problem. Since October, its events have looked more and more like half-empty classrooms.",
    "The president thinks they know why: \"Maybe students just aren't interested in workshops anymore. Should we replace them with more social events?\"",
    "But there's a catch. Quillmoor Software, the club's sponsor, pays for those workshops. The sponsor renewal meeting is this Friday, and the president doesn't want to make the wrong call."
  ],
  assumption: "\"Students are bored with workshops. Let's replace them with more socials.\"",
  question: "Why are our events half empty: the topics, the timing or the promotion? And what should we change next semester?",
  hypotheses: [
    { id: "H1", title: "The topics", suspicion: "Students are getting bored with workshops.", challenge: "Compare workshops with the other event types. Are the topics really the problem?" },
    { id: "H2", title: "The promotion", suspicion: "Maybe we're not promoting our events enough.", challenge: "Look at the promotion posts. Does less promotion mean fewer people?" },
    { id: "H3", title: "The timing", suspicion: "Perhaps we run events at the wrong times.", challenge: "Look at when events take place. Do some days or time slots do worse?" }
  ],
  mustInclude: [
    { title: "The big finding", text: "A headline that tells the president what you found, in one sentence." },
    { title: "The key number", text: "At least one KPI with an important result." },
    { title: "The visual evidence", text: "At least one chart that proves your finding." },
    { title: "The next move", text: "What the club should do next semester." }
  ],
  hints: [
    { minute: 10, text: "People can sign up for an event and then not come. Compare registered with checked_in. Where are the missing people?" },
    { minute: 20, text: "Workshops look worst. But when were they held? Compare the same topic on different days." }
  ],
  deliverable: "Page 1 of your app: the finding, a key number, a chart that proves it, and the next move."
};

function sample(t) {
  const sum = (es, f) => es.reduce((s, e) => s + f(e), 0);
  const pct = (a, b) => Math.round(a / b * 1000) / 10;
  const fill = (es) => pct(sum(es, (e) => e.checked_in), sum(es, (e) => e.capacity));
  const cc = t.events.filter((e) => e.club_id === "C01");
  const week = (es, w) => es.filter((e) => e.week === w);
  const reachOf = (es) => Math.round(sum(t.promotion_posts.filter((p) => es.some((e) => e.event_id === p.event_id)), (p) => p.reach) / es.length);
  const last6 = [5, 6, 7, 8, 9, 10];

  const kpiState = (value, target, higherIsBetter) => {
    const good = higherIsBetter ? value >= target : value <= target;
    return good ? "Good" : Math.abs(value - target) / target <= 0.1 ? "Critical" : "Error";
  };
  const kpi = (id, title, subtitle, value, unit, target, icon, history) => {
    const first = history[0], last = history[history.length - 1];
    return {
      id, title, subtitle, value, unit, target, deltaPercent: Math.round((last - first) / first * 1000) / 10, trend: last >= first ? "Up" : "Down",
      state: kpiState(value, target, true), icon, higherIsBetter: true,
      history: history.map((v, i) => ({ x: i, period: "Wk " + last6[i], value: v }))
    };
  };
  const ratingOf = (es) => Math.round(sum(es, (e) => e.avg_rating) / es.length * 10) / 10;
  const recent = cc.filter((e) => e.week >= 7);
  const kpis = [
    kpi("seatsFilled", "Seats filled", "Coding Club, checked in ÷ seats", fill(cc), "%", 80, "sap-icon://group", last6.map((w) => fill(week(cc, w)))),
    kpi("signUps", "Sign-ups", "Coding Club, signed up ÷ seats", pct(sum(cc, (e) => e.registered), sum(cc, (e) => e.capacity)), "%", 80, "sap-icon://add-employee",
      last6.map((w) => pct(sum(week(cc, w), (e) => e.registered), sum(week(cc, w), (e) => e.capacity)))),
    kpi("rating", "Rating", "Coding Club, average feedback", ratingOf(cc), "/ 5", 4, "sap-icon://favorite", last6.map((w) => ratingOf(week(cc, w)))),
    kpi("reach", "Promotion reach", "People reached per event, weeks 7-10", reachOf(recent), "people", 600, "sap-icon://marketing-campaign", last6.map((w) => reachOf(week(cc, w))))
  ];

  const lastYear = [86, 84, 85, 83, 84, 82, 83, 81, 82, 80]; // last autumn's report, for the "this year vs. last year" chart
  const trend = [...Array(10)].map((_, i) => ({ month: "Wk " + (i + 1), actual: fill(week(cc, i + 1)), plan: 80, previousYear: lastYear[i] }));

  const state = (value, target) => (value >= target ? "Good" : value >= target * 0.9 ? "Critical" : "Error");
  const byClub = t.clubs.map((c) => {
    const es = t.events.filter((e) => e.club_id === c.club_id);
    return { club: c, es, people: sum(es, (e) => e.checked_in), target: Math.round(sum(es, (e) => e.capacity) * 0.8), fill: fill(es) };
  });
  const total = sum(byClub, (b) => b.people);
  const breakdown = byClub.map((b) => ({ name: b.club.name, value: b.people, target: b.target, share: pct(b.people, total), state: state(b.people, b.target) }));

  const itemState = (f) => (f >= 80 ? ["On target", "Success"] : f >= 70 ? ["Below target", "Warning"] : ["Well below target", "Error"]);
  const items = byClub.map((b) => {
    const [status, st] = itemState(b.fill);
    return {
      id: b.club.club_id, title: b.club.name, subtitle: b.club.category + " · " + b.es.length + " events", owner: b.es[0].organiser,
      date: b.es[b.es.length - 1].date, amount: b.club.members, unit: "members", quantity: b.es.length, progress: Math.round(b.fill), status, state: st
    };
  }).sort((a, b) => a.progress - b.progress);

  const early = cc.filter((e) => e.week <= 4), late = cc.filter((e) => e.week >= 5);
  const alerts = [
    { type: "Error", title: "Seats half empty since October", description: `The Coding Club filled ${Math.round(fill(late))}% of its seats in weeks 5-10, after ${Math.round(fill(early))}% in weeks 1-4.`, date: "2026-11-13" },
    { type: "Warning", title: "Sponsor renewal on Friday", description: "Quillmoor Software pays EUR 800 a semester for the workshops. Renewal meeting: Fri 20 Nov.", date: "2026-11-20" },
    { type: "Information", title: "No more Instagram posts", description: "The Coding Club stopped posting on Instagram in week 7 (from 19 Oct).", date: "2026-10-19" },
    { type: "Information", title: "Room plan for spring 2027 is out", description: "The weekly room bookings for next semester are fixed (table room_bookings).", date: "2026-11-09" }
  ];

  const clubList = byClub.map((b) => Object.assign({}, b.club, {
    organiser: b.es[0].organiser, events: b.es.length, fill_pct: Math.round(b.fill),
    showup_pct: Math.round(pct(sum(b.es, (e) => e.checked_in), sum(b.es, (e) => e.registered))),
    eventList: b.es.map((e) => ({ title: e.title, topic: e.topic, date: e.date, weekday: e.weekday, start_time: e.start_time, room: e.room, fill_pct: e.fill_pct, avg_rating: e.avg_rating }))
  }));

  const meta = {
    company: "Coding Club", title: "Coding Club · autumn semester 2026",
    description: "8 student clubs, 90 events, weeks 1-10 (7 Sep - 13 Nov 2026). Fictional data.",
    question: CASE.question,
    asOf: "13 Nov 2026",
    trend: { title: "Seats filled per week", subtitle: "Coding Club, checked in ÷ seats, %", unit: "%", actualLabel: "Seats filled %", planLabel: "Target" },
    breakdown: { title: "People per club", subtitle: "Checked in this semester vs. 80% of seats", unit: "people" },
    items: { title: "Student clubs", subtitle: "All 8 clubs this semester", columns: { id: "Club", title: "Club", subtitle: "Category", owner: "Organiser", date: "Last event", amount: "Members", progress: "Seats filled", status: "Status" } }
  };
  return { meta, kpis, trend, breakdown, items, alerts, clubList };
}

module.exports = { TABLES, RELATIONS, CASE, sample };
