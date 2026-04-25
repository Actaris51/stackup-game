"""Generate tablet screenshots for Play Store (7" and 10")."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Reuse make_screenshot
from generate_store_assets import make_screenshot

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "store-assets")

    # 7-inch tablet (portrait) — 1200x1920
    screens_7 = [
        ("Tap to stack!", 5, 5),
        ("Stack higher!", 10, 10),
        ("Beat your record", 18, 18),
    ]
    for i, (title, h, score) in enumerate(screens_7, 1):
        s = make_screenshot(title, tower_height=h, score=score, size=(1200, 1920))
        s.save(os.path.join(out_dir, f"tablet-7in-{i}.png"))
        print(f"Wrote tablet-7in-{i}.png (1200x1920)")

    # 10-inch tablet (portrait) — 1600x2560
    for i, (title, h, score) in enumerate(screens_7, 1):
        s = make_screenshot(title, tower_height=h, score=score, size=(1600, 2560))
        s.save(os.path.join(out_dir, f"tablet-10in-{i}.png"))
        print(f"Wrote tablet-10in-{i}.png (1600x2560)")
