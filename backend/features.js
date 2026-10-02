// v2.2: feature toggles are Owner-managed settings (Owner Tools →
// Features), read per request — no restart, no env var. See settings.js.
const settings = require("./settings");

const FEATURES = {};
Object.defineProperty(FEATURES, "homeAssistantAlarms", {
  enumerable: true,
  get() { return settings.current().features.homeAssistantAlarms; },
});

module.exports = { FEATURES };
