// Strips the aps-environment (Push Notifications) entitlement that the
// expo-notifications config plugin adds unconditionally.
//
// StackUp only uses LOCAL notifications (streak reminder) — those need no
// push capability at all. Keeping the entitlement would force enabling
// Push Notifications on the App ID and regenerating the provisioning
// profile for nothing (the 2026-07-13 EAS build failed exactly on that:
// "profile doesn't support the Push Notifications capability").
//
// Must stay LAST in the app.json plugins array so it runs after every
// plugin that might (re)add the entitlement.

const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
