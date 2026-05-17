"""Optimize AI-generated theme backgrounds + marketing art for the app.

Source images live in "Images generees/" (AI-generated one-offs, NOT
checked into git — they're ~10 MB of raw PNG). This script downscales and
re-encodes them into bundle-friendly assets:

  Theme backgrounds  -> assets/backgrounds/<theme>.webp   (height 2400, q82)
  Play feature image -> assets/marketing/play-feature-graphic.png (1024x500)
  Social promo       -> assets/marketing/social-promo.png   (1080x1080)

WebP for the backgrounds: ~6 MB of PNG collapses to ~1 MB with no visible
loss on dark gradients, and React Native / Expo decode WebP natively on
both platforms. Marketing art stays PNG (store upload tools are pickier).

Run: `python scripts/process-theme-backgrounds.py`
Re-runnable and deterministic given the same source files.
"""

import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "Images generees")
BG_OUT = os.path.join(ROOT, "assets", "backgrounds")
MKT_OUT = os.path.join(ROOT, "assets", "marketing")

# Theme id  ->  source filename. Forest uses the cleaner "Forest 2" (less
# busy in the centre where the block tower sits). Classic + Monochrome get
# NO image on purpose — their flat identity is intentional.
THEME_SOURCES = {
    "sunset": "Sunset.png",
    "ocean": "Ocean.png",
    "forest": "Forest 2.png",
    "neon": "Neon.png",
    "galaxy": "Galaxy.png",
}

BG_TARGET_HEIGHT = 2400  # generous for any phone; cover-scaled at runtime
WEBP_QUALITY = 82


def _resize_to_height(img: Image.Image, target_h: int) -> Image.Image:
    if img.height <= target_h:
        return img
    ratio = target_h / img.height
    return img.resize(
        (round(img.width * ratio), target_h), Image.LANCZOS
    )


def process_backgrounds() -> None:
    os.makedirs(BG_OUT, exist_ok=True)
    for theme_id, fname in THEME_SOURCES.items():
        src_path = os.path.join(SRC, fname)
        if not os.path.exists(src_path):
            print(f"  !! missing source {src_path} — skipped")
            continue
        img = Image.open(src_path).convert("RGB")
        img = _resize_to_height(img, BG_TARGET_HEIGHT)
        out_path = os.path.join(BG_OUT, f"{theme_id}.webp")
        img.save(out_path, "WEBP", quality=WEBP_QUALITY, method=6)
        kb = os.path.getsize(out_path) // 1024
        print(f"  -> {out_path}  ({img.width}x{img.height}, {kb} KB)")


def process_marketing() -> None:
    os.makedirs(MKT_OUT, exist_ok=True)

    banner_src = os.path.join(SRC, "Banner.png")
    if os.path.exists(banner_src):
        # Google Play feature graphic must be EXACTLY 1024x500.
        img = Image.open(banner_src).convert("RGB").resize(
            (1024, 500), Image.LANCZOS
        )
        out = os.path.join(MKT_OUT, "play-feature-graphic.png")
        img.save(out, "PNG", optimize=True)
        print(f"  -> {out}  (1024x500, {os.path.getsize(out)//1024} KB)")

    fb_src = os.path.join(SRC, "Facebook.png")
    if os.path.exists(fb_src):
        img = Image.open(fb_src).convert("RGB").resize(
            (1080, 1080), Image.LANCZOS
        )
        out = os.path.join(MKT_OUT, "social-promo.png")
        img.save(out, "PNG", optimize=True)
        print(f"  -> {out}  (1080x1080, {os.path.getsize(out)//1024} KB)")


if __name__ == "__main__":
    print("Theme backgrounds:")
    process_backgrounds()
    print("Marketing art:")
    process_marketing()
    print("Done.")
