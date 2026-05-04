import ExpoModulesCore
import GameKit
import UIKit

// Local Expo Module wrapping the Apple Game Center APIs needed by StackUp.
//
// All public methods resolve cleanly even when the user is not signed in or
// has declined Game Center — the JS layer treats them as silent best-effort.
// This is intentional: the game must never block on Game Center.

public class StackUpGameCenterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StackUpGameCenterModule")

    AsyncFunction("authenticate") { (promise: Promise) in
      let player = GKLocalPlayer.local

      // Already authenticated — short-circuit
      if player.isAuthenticated {
        promise.resolve([
          "authenticated": true,
          "playerId": player.gamePlayerID,
          "displayName": player.displayName,
        ])
        return
      }

      player.authenticateHandler = { viewController, error in
        // Apple sends a sign-in view controller — present it from the rootVC
        if let vc = viewController {
          DispatchQueue.main.async {
            Self.rootViewController()?.present(vc, animated: true, completion: nil)
          }
          return
        }

        if let error = error {
          NSLog("[GameCenter] Auth error: \(error.localizedDescription)")
          promise.resolve([
            "authenticated": false,
          ])
          return
        }

        let local = GKLocalPlayer.local
        promise.resolve([
          "authenticated": local.isAuthenticated,
          "playerId": local.isAuthenticated ? local.gamePlayerID : NSNull(),
          "displayName": local.isAuthenticated ? local.displayName : NSNull(),
        ])
      }
    }

    AsyncFunction("submitScore") { (leaderboardId: String, score: Int, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(nil)
        return
      }
      GKLeaderboard.submitScore(
        score,
        context: 0,
        player: GKLocalPlayer.local,
        leaderboardIDs: [leaderboardId]
      ) { error in
        if let error = error {
          NSLog("[GameCenter] submitScore \(leaderboardId) error: \(error.localizedDescription)")
        }
        promise.resolve(nil)
      }
    }

    AsyncFunction("unlockAchievement") { (achievementId: String, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(nil)
        return
      }
      let achievement = GKAchievement(identifier: achievementId)
      achievement.percentComplete = 100.0
      achievement.showsCompletionBanner = true
      GKAchievement.report([achievement]) { error in
        if let error = error {
          NSLog("[GameCenter] unlock \(achievementId) error: \(error.localizedDescription)")
        }
        promise.resolve(nil)
      }
    }

    AsyncFunction("reportProgress") { (achievementId: String, percentComplete: Double, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(nil)
        return
      }
      let achievement = GKAchievement(identifier: achievementId)
      achievement.percentComplete = max(0, min(100, percentComplete))
      // Only show the banner if it just completed
      achievement.showsCompletionBanner = achievement.percentComplete >= 100.0
      GKAchievement.report([achievement]) { error in
        if let error = error {
          NSLog("[GameCenter] progress \(achievementId) error: \(error.localizedDescription)")
        }
        promise.resolve(nil)
      }
    }

    AsyncFunction("showLeaderboard") { (leaderboardId: String?, promise: Promise) in
      DispatchQueue.main.async {
        let vc: GKGameCenterViewController
        if let leaderboardId = leaderboardId, !leaderboardId.isEmpty {
          vc = GKGameCenterViewController(
            leaderboardID: leaderboardId,
            playerScope: .global,
            timeScope: .allTime
          )
        } else {
          vc = GKGameCenterViewController(state: .leaderboards)
        }
        vc.gameCenterDelegate = StackUpGameCenterPresenter.shared
        Self.rootViewController()?.present(vc, animated: true)
        promise.resolve(nil)
      }
    }

    AsyncFunction("showAchievements") { (promise: Promise) in
      DispatchQueue.main.async {
        let vc = GKGameCenterViewController(state: .achievements)
        vc.gameCenterDelegate = StackUpGameCenterPresenter.shared
        Self.rootViewController()?.present(vc, animated: true)
        promise.resolve(nil)
      }
    }

    AsyncFunction("showGameCenter") { (promise: Promise) in
      DispatchQueue.main.async {
        let vc = GKGameCenterViewController(state: .dashboard)
        vc.gameCenterDelegate = StackUpGameCenterPresenter.shared
        Self.rootViewController()?.present(vc, animated: true)
        promise.resolve(nil)
      }
    }
  }

  private static func rootViewController() -> UIViewController? {
    return UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first?
      .rootViewController?
      .topMostPresentedViewController()
  }
}

// Singleton delegate that just dismisses the GC sheet on Done
private class StackUpGameCenterPresenter: NSObject, GKGameCenterControllerDelegate {
  static let shared = StackUpGameCenterPresenter()

  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true, completion: nil)
  }
}

private extension UIViewController {
  func topMostPresentedViewController() -> UIViewController {
    if let presented = presentedViewController {
      return presented.topMostPresentedViewController()
    }
    return self
  }
}
