// v1.8: a fresh MaintEnhance deployment starts completely empty — no
// demo furnace/HVAC/utility-room sample data. This is inserted once, on
// first-run setup (see POST /api/auth/setup in server.js), and is just
// the initial shape of the app_data JSON document: every collection the
// rest of the app expects, all empty, with counters at zero.
module.exports = {
  locations: [],
  assets: [],
  bomNodes: [],
  pmTemplates: [],
  workRequests: [],
  workOrders: [],
  benchmarks: [],
  vendors: [],
  inventory: [],
  counters: { wo: 0, wr: 0, part: 0 },
};
