// Expo config plugin: enable Apple Game Center capability + entitlement.
//
// This plugin:
// 1. Adds the `com.apple.developer.game-center` entitlement to the iOS build
//    so GKLocalPlayer.authenticate() actually works.
// 2. Lets the Xcode project request the Game Center capability automatically.
//
// The local native module under `modules/game-center/` is auto-discovered by
// Expo's autolinking via the `expo.autolinking.nativeModulesDir` field in
// the host's package.json — nothing more is needed there.

const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

module.exports = function withGameCenter(config) {
  // 1. Entitlement
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.game-center'] = true;
    return cfg;
  });

  // 2. (Optional) Make sure the app declares it uses Game Center in Info.plist.
  // Apple no longer requires GKGameCenterEnabled but we'll add it for clarity.
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.GKGameCenterEnabled = true;
    return cfg;
  });

  return config;
};
