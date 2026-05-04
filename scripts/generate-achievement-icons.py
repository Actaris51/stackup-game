"""Generate StackUp Game Center achievement icons (512x512 PNGs).

Game Center requires square 512x512 PNGs for each achievement (and Apple
displays them at multiple sizes, so use clean simple shapes that scale well).

Each icon reuses the StackUp visual identity (stacked blocks palette + dark
background) and overlays a glyph or count specific to the achievement.

Run: `python scripts/generate-achievement-icons.py`
Outputs to `assets/achievements/<id>.png`.
"""
from PIL import Image, ImageDraw, ImageFont
import os

# StackUp palette (same as icon)
BG = (26, 26, 46)
PALETTE = [
    (251, 191, 36),    # gold
    (52, 211, 153),    # teal
    (96, 165, 250),    # blue
    (167, 139, 250),   # purple
    (244, 114, 182),   # pink
]
TEXT = (240, 240, 250)
ACCENT = (251, 191, 36)


def base_canvas(size=512):
    img = Image.new("RGBA", (size, size), BG + (255,))
    return img


def stacked_blocks(draw, size, n_blocks=3, opacity=200):
    """Draw a centered tower of n_blocks tapered blocks (faded background motif)."""
    block_h = int(size * 0.10)
    base_w = int(size * 0.50)
    cx = size // 2
    start_y = int(size * 0.65)
    for i in range(n_blocks):
        w = int(base_w * (1 - i * 0.18))
        y = start_y - i * block_h
        x1 = cx - w // 2
        x2 = cx + w // 2
        color = PALETTE[i % len(PALETTE)] + (opacity,)
        draw.rounded_rectangle(
            [x1, y, x2, y + int(block_h * 0.85)],
            radius=int(block_h * 0.22),
            fill=color,
        )


def get_font(size):
    # Try a few common bold system fonts; fall back to default
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def draw_centered_text(draw, text, y, size, color=TEXT, font_size=None):
    if font_size is None:
        font_size = int(size * 0.22)
    font = get_font(font_size)
    # Pillow >= 10: use textbbox
    try:
        l, t, r, b = draw.textbbox((0, 0), text, font=font)
        w, h = r - l, b - t
    except Exception:
        w, h = font.getsize(text)
    draw.text(((size - w) / 2 - l, y), text, fill=color + (255,), font=font)


def make_score(target, size=512):
    img = base_canvas(size)
    draw = ImageDraw.Draw(img)
    stacked_blocks(draw, size, n_blocks=4, opacity=80)
    # Big number
    draw_centered_text(draw, str(target), int(size * 0.30), size, color=ACCENT, font_size=int(size * 0.32))
    draw_centered_text(draw, "SCORE", int(size * 0.16), size, color=TEXT, font_size=int(size * 0.07))
    return img


def make_perfect(streak, size=512):
    img = base_canvas(size)
    draw = ImageDraw.Draw(img)
    # Top label
    draw_centered_text(draw, "PERFECT", int(size * 0.10), size, color=TEXT, font_size=int(size * 0.07))
    # Bullseye / target rings
    cx, cy = size // 2, int(size * 0.50)
    for i, color in enumerate(PALETTE[:4]):
        r = int(size * (0.26 - i * 0.05))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color + (255,), width=int(size * 0.022))
    # Bottom streak number
    draw_centered_text(draw, f"x{streak}", int(size * 0.78), size, color=ACCENT, font_size=int(size * 0.18))
    return img


def make_plays(target, size=512):
    img = base_canvas(size)
    draw = ImageDraw.Draw(img)
    # Top label
    draw_centered_text(draw, "PARTIES", int(size * 0.10), size, color=TEXT, font_size=int(size * 0.07))
    # Play arrow centered
    cx, cy = size // 2, int(size * 0.42)
    s = int(size * 0.16)
    triangle = [(cx - s // 2, cy - s), (cx - s // 2, cy + s), (cx + s, cy)]
    draw.polygon(triangle, fill=ACCENT + (255,))
    # Big number bottom
    draw_centered_text(draw, str(target), int(size * 0.66), size, color=TEXT, font_size=int(size * 0.20))
    return img


def make_total(target, size=512):
    img = base_canvas(size)
    draw = ImageDraw.Draw(img)
    # Top label
    draw_centered_text(draw, "BLOCS", int(size * 0.08), size, color=TEXT, font_size=int(size * 0.07))
    # Big number below the label
    draw_centered_text(draw, str(target), int(size * 0.18), size, color=ACCENT, font_size=int(size * 0.18))
    # Faded blocks tower at the bottom
    block_h = int(size * 0.07)
    base_w = int(size * 0.50)
    cx = size // 2
    start_y = int(size * 0.92) - block_h
    for i in range(5):
        w = int(base_w * (1 - i * 0.13))
        y = start_y - i * block_h
        x1 = cx - w // 2
        x2 = cx + w // 2
        color = PALETTE[i % len(PALETTE)] + (220,)
        draw.rounded_rectangle(
            [x1, y, x2, y + int(block_h * 0.85)],
            radius=int(block_h * 0.22),
            fill=color,
        )
    return img


def make_score(target, size=512):
    """Override of the earlier definition with cleaner layout."""
    img = base_canvas(size)
    draw = ImageDraw.Draw(img)
    # Top label
    draw_centered_text(draw, "SCORE", int(size * 0.10), size, color=TEXT, font_size=int(size * 0.07))
    # Big number
    draw_centered_text(draw, str(target), int(size * 0.20), size, color=ACCENT, font_size=int(size * 0.30))
    # Faded blocks tower at the bottom
    block_h = int(size * 0.08)
    base_w = int(size * 0.45)
    cx = size // 2
    start_y = int(size * 0.92) - block_h
    for i in range(4):
        w = int(base_w * (1 - i * 0.18))
        y = start_y - i * block_h
        x1 = cx - w // 2
        x2 = cx + w // 2
        color = PALETTE[i % len(PALETTE)] + (180,)
        draw.rounded_rectangle(
            [x1, y, x2, y + int(block_h * 0.85)],
            radius=int(block_h * 0.22),
            fill=color,
        )
    return img


ACHIEVEMENTS = [
    ("STACKUP_FIRST_10", lambda: make_score(10)),
    ("STACKUP_SCORE_25", lambda: make_score(25)),
    ("STACKUP_SCORE_50", lambda: make_score(50)),
    ("STACKUP_SCORE_100", lambda: make_score(100)),
    ("STACKUP_PERFECT_5", lambda: make_perfect(5)),
    ("STACKUP_PERFECT_10", lambda: make_perfect(10)),
    ("STACKUP_PLAYS_10", lambda: make_plays(10)),
    ("STACKUP_PLAYS_100", lambda: make_plays(100)),
    ("STACKUP_TOTAL_500", lambda: make_total(500)),
    ("STACKUP_TOTAL_2500", lambda: make_total(2500)),
]


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "achievements")
    os.makedirs(out_dir, exist_ok=True)
    for ach_id, factory in ACHIEVEMENTS:
        img = factory()
        out_path = os.path.join(out_dir, f"{ach_id}.png")
        img.save(out_path)
        print(f"Wrote {out_path}")
