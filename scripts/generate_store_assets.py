"""Generate Play Store assets: feature graphic and phone screenshots."""
from PIL import Image, ImageDraw, ImageFont
import os

BG = (26, 26, 46)
COLORS = [
    (251, 191, 36),    # Gold bottom
    (52, 211, 153),    # Teal
    (96, 165, 250),    # Blue
    (167, 139, 250),   # Purple
    (244, 114, 182),   # Pink top
]


def try_font(size):
    """Try a few common font paths, fall back to default."""
    for path in [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_stack(draw, cx, cy, max_width, num_blocks=5, block_h=40):
    """Draw a stack of blocks centered at cx, cy."""
    widths = [int(max_width * r) for r in [0.95, 0.85, 0.72, 0.58, 0.42]]
    total_h = block_h * num_blocks
    start_y = cy - total_h // 2
    radius = int(block_h * 0.25)
    for i in range(num_blocks):
        color = COLORS[i]
        w = widths[i]
        y = start_y + i * block_h
        draw.rounded_rectangle(
            [cx - w // 2, y, cx + w // 2, y + int(block_h * 0.88)],
            radius=radius,
            fill=color + (255,),
        )
        hl = tuple(min(255, c + 40) for c in color) + (80,)
        draw.rounded_rectangle(
            [cx - w // 2 + 4, y + 2, cx + w // 2 - 4, y + int(block_h * 0.35)],
            radius=max(2, radius - 2),
            fill=hl,
        )


def make_feature_graphic():
    """1024x500 feature graphic for Play Store."""
    W, H = 1024, 500
    img = Image.new("RGBA", (W, H), BG + (255,))
    draw = ImageDraw.Draw(img)

    # Stack on the right
    draw_stack(draw, W - 220, H // 2, max_width=260, num_blocks=5, block_h=52)

    # Title on the left
    title_font = try_font(90)
    subtitle_font = try_font(32)
    draw.text((60, 150), "StackUp", font=title_font, fill=(255, 255, 255))
    draw.text(
        (62, 260),
        "Stack blocks. Beat your record.",
        font=subtitle_font,
        fill=(200, 200, 220),
    )

    return img.convert("RGB")


def make_screenshot(title, tower_height=8, score=0, size=(1080, 1920)):
    """Make a phone screenshot with stacked tower."""
    W, H = size
    img = Image.new("RGBA", (W, H), BG + (255,))
    draw = ImageDraw.Draw(img)

    # Score at top
    score_font = try_font(80)
    draw.text((W // 2 - 100, 120), f"{score}", font=score_font, fill=(255, 255, 255))
    sub_font = try_font(36)
    bbox = draw.textbbox((0, 0), "SCORE", font=sub_font)
    draw.text(
        ((W - (bbox[2] - bbox[0])) // 2, 80), "SCORE", font=sub_font, fill=(160, 160, 180)
    )

    # Tower of blocks - use all COLORS with variation
    block_h = 70
    base_width = int(W * 0.75)
    cx = W // 2
    start_y = H - 300
    for i in range(tower_height):
        color = COLORS[i % len(COLORS)]
        # Each level gets slightly narrower to show stacking
        shrink = 1.0 - (i * 0.02)
        w = int(base_width * shrink)
        y = start_y - i * block_h
        radius = int(block_h * 0.22)
        draw.rounded_rectangle(
            [cx - w // 2, y, cx + w // 2, y + block_h - 4],
            radius=radius,
            fill=color + (255,),
        )
        hl = tuple(min(255, c + 40) for c in color) + (80,)
        draw.rounded_rectangle(
            [cx - w // 2 + 8, y + 4, cx + w // 2 - 8, y + int(block_h * 0.35)],
            radius=max(2, radius - 2),
            fill=hl,
        )

    # Caption at bottom
    cap_font = try_font(54)
    tw = draw.textlength(title, font=cap_font)
    draw.text(((W - tw) // 2, H - 180), title, font=cap_font, fill=(255, 255, 255))

    return img.convert("RGB")


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "store-assets")
    os.makedirs(out_dir, exist_ok=True)

    # Feature graphic
    fg = make_feature_graphic()
    fg.save(os.path.join(out_dir, "feature-graphic.png"))
    print(f"Wrote feature-graphic.png ({fg.size})")

    # Phone screenshots — 1080x1920 portrait
    screens = [
        ("Tap to stack!", 5, 5),
        ("Stack higher!", 10, 10),
        ("Beat your record", 18, 18),
    ]
    for i, (title, h, score) in enumerate(screens, 1):
        s = make_screenshot(title, tower_height=h, score=score)
        s.save(os.path.join(out_dir, f"screenshot-{i}.png"))
        print(f"Wrote screenshot-{i}.png ({s.size}) — {title}")
