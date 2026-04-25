"""Generate App Store screenshots (iPhone sizes)."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from generate_store_assets import make_screenshot

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "store-assets")

    screens = [
        ("Tap to stack!", 5, 5),
        ("Stack higher!", 10, 10),
        ("Beat your record", 18, 18),
    ]

    # iPhone 6.9" (1320x2868) — required by Apple since 2024
    for i, (title, h, score) in enumerate(screens, 1):
        s = make_screenshot(title, tower_height=h, score=score, size=(1320, 2868))
        s.save(os.path.join(out_dir, f"iphone-69in-{i}.png"))
        print(f"Wrote iphone-69in-{i}.png (1320x2868)")

    # iPhone 6.5" (1242x2688) — fallback for older devices
    for i, (title, h, score) in enumerate(screens, 1):
        s = make_screenshot(title, tower_height=h, score=score, size=(1242, 2688))
        s.save(os.path.join(out_dir, f"iphone-65in-{i}.png"))
        print(f"Wrote iphone-65in-{i}.png (1242x2688)")
