// v2: the componentization / feature-flag layer.
//
// MaintEnhance is built and shipped from one codebase, but different
// deployments ("editions" — the consumer Home edition, a Township/
// municipal fork, future client forks) want a different subset of
// features active. Rather than branching the codebase per fork, each
// optional feature is gated behind an env var read once at startup, so
// a fork is just a docker-compose.yml (or Portainer stack env) with a
// different set of FEATURE_* values — no code change, no separate
// branch to maintain.
//
// This is deliberately *not* an in-app, Owner-toggleable setting: which
// features a deployment offers is a decision made once, when that
// deployment is stood up (by whoever configures the compose file/stack),
// not something end users flip day to day. That keeps it simple and
// keeps a fork's identity in its deployment config, where it belongs.
//
// Adding a new componentized feature: add its flag here (default to
// `true` so existing deployments keep today's behavior unchanged unless
// they opt out), document the env var in .env.example and
// docker-compose.yml, and gate the relevant route(s)/UI on it — see
// homeAssistantAlarms below and its use in server.js for the pattern.
function readFlag(envVar, defaultValue) {
  const raw = process.env[envVar];
  if (raw == null || raw === "") return defaultValue;
  return raw.toLowerCase() !== "false" && raw !== "0";
}

const FEATURES = {
  // v1.7's Home Assistant sensor-alarm webhook integration (the inbound
  // webhook itself, the entity-to-asset/location mapping table, and the
  // webhook API key). Componentized in v2 so a fork with no Home
  // Assistant story (e.g. a municipal/parks-and-rec deployment) can turn
  // it off entirely, while keeping the rest of the Alarm Dashboard (v1.8's
  // PM-checklist-triggered and manually-raised alarms, which aren't
  // Home-Assistant-specific) always on regardless of this flag.
  homeAssistantAlarms: readFlag("FEATURE_HA_ALARMS", true),
};

module.exports = { FEATURES };
