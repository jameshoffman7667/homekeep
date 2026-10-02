// Edition presets: branding, terminology, and default feature flags for
// each MaintEnhance "edition". Pick one with the EDITION env var (default
// "home"). Any value here can be overridden per deployment, without
// touching this file or rebuilding the image, by either:
//   1. individual env vars (BRAND_NAME, BRAND_COLOR_PRIMARY, ... — see
//      edition.js for the full list and .env.example), or
//   2. dropping a `branding.config.js` of the same shape into the data
//      volume (DATA_DIR/branding.config.js). It is deep-merged over this
//      file, so it only needs to contain what differs.
// Precedence, lowest to highest: this file < DATA_DIR override file <
// env vars.
//
// Stored data never depends on these labels: location levels are stored
// under stable internal keys (Property/Structure/Floor/Room/Area/
// Sub-area) and only *displayed* with the labels below, so relabeling
// later is safe and never touches existing records.
module.exports = {
  editions: {
    home: {
      brand: {
        name: "MaintEnhance",
        shortName: "ME",
        tagline: "Maintenance Management",
        logoUrl: "", // empty = the built-in wrench mark
        colors: {
          primary: "#28415F",
          primaryDark: "#7FA3CC",
          accent: "#C85410",
          accentDark: "#E38C4E",
        },
      },
      terms: {
        // The word used where the UI says "your household" / "household
        // members". Case is preserved when substituted.
        orgNoun: "household",
        // Display labels for the six location levels, top to bottom.
        locationLevels: ["Property", "Structure", "Floor", "Room", "Area", "Sub-area"],
        // Which level (0-based index into locationLevels) carries an
        // address / year built / climate zone and offers the PM setup
        // wizard. Home: the Property (index 0).
        siteLevelIndex: 0,
      },
      features: {
        homeAssistantAlarms: true,
      },
    },

    // Facilities edition (parks, recreation, buildings). The
    // organization's own name and logo are supplied per deployment via
    // BRAND_NAME / BRAND_LOGO_URL (see editions/facilities/) rather than
    // baked in here, so this preset stays reusable.
    facilities: {
      brand: {
        name: "MaintEnhance",
        shortName: "", // set BRAND_SHORT_NAME (<=12 chars) for the installed-app label
        tagline: "Facilities Maintenance",
        logoUrl: "",
        colors: {
          primary: "#28415F",
          primaryDark: "#7FA3CC",
          accent: "#C85410",
          accentDark: "#E38C4E",
        },
      },
      terms: {
        orgNoun: "organization",
        // Organization → Site → Structure/Zone → Sub-zone → Area → Sub-area
        locationLevels: ["Organization", "Site", "Structure/Zone", "Sub-zone", "Area", "Sub-area"],
        // The Site (index 1) carries the address and the PM setup wizard.
        siteLevelIndex: 1,
      },
      features: {
        homeAssistantAlarms: false,
      },
    },
  },
};
