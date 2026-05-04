"""Generate StackUp marketing screenshots for the App Store.

Output: 6 PNG files at iPhone 6.7" required size (1290 × 2796), portrait.
Apple accepts these as the only screenshot set since iOS 17 — they cover all
device sizes via aspect-ratio match.

Run: `python scripts/generate-marketing-screenshots.py`
Outputs to `assets/marketing/screenshot-1.png` ... `screenshot-6.png`.

Design language: aligns with StackUp icon (dark navy bg + colorful tower) and
the app's v1.1 themes. Big bold headlines, sub-titles, phone mockup centered.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
import math

# ----------------------------------------------------------------------------
# Sizing — App Store iPhone 6.7" required dimensions
# ----------------------------------------------------------------------------
W, H = 1290, 2796  # px

# ----------------------------------------------------------------------------
# Palette (matches StackUp icon + Classic theme)
# ----------------------------------------------------------------------------
NAVY = (16, 16, 36)           # background top
INDIGO = (8, 8, 22)            # background bottom
ACCENT = (233, 69, 96)         # game accent (e94560)
GOLD = (255, 215, 0)
WHITE = (255, 255, 255)
LAVENDER = (200, 181, 217)     # subtitle color

CLASSIC_PALETTE = [
    (255, 107, 107), (255, 142, 83), (255, 189, 105), (255, 230, 109),
    (149, 224, 108), (78, 205, 196), (69, 183, 209), (108, 92, 231),
    (165, 94, 234), (253, 121, 168),
]

# v1.1 theme palettes (same as src/constants/themes.ts)
THEME_PALETTES = {
    'classic': CLASSIC_PALETTE,
    'sunset': [(255, 78, 80), (252, 145, 58), (249, 212, 35), (255, 112, 67), (233, 30, 99)],
    'ocean': [(0, 180, 216), (0, 150, 199), (72, 202, 228), (144, 224, 239), (0, 119, 182)],
    'forest': [(82, 183, 136), (116, 198, 157), (149, 213, 178), (183, 228, 199), (64, 145, 108)],
    'neon': [(255, 0, 110), (251, 86, 7), (255, 190, 11), (131, 56, 236), (58, 134, 255)],
    'monochrome': [(255, 255, 255), (224, 224, 224), (189, 189, 189), (158, 158, 158), (117, 117, 117)],
    'galaxy': [(114, 9, 183), (86, 11, 173), (72, 12, 168), (58, 12, 163), (63, 55, 201)],
}

# ----------------------------------------------------------------------------
# Font helpers
# ----------------------------------------------------------------------------
FONT_CANDIDATES_BOLD = [
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "/System/Library/Fonts/SFNS.ttf",
]
FONT_CANDIDATES_REGULAR = [
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/System/Library/Fonts/SFNS.ttf",
]


def get_font(size, bold=True):
    paths = FONT_CANDIDATES_BOLD if bold else FONT_CANDIDATES_REGULAR
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def draw_centered(draw, text, y, font, color):
    """Draw `text` horizontally centered at vertical position `y` (top of text)."""
    try:
        l, t, r, b = draw.textbbox((0, 0), text, font=font)
        w = r - l
        x = (W - w) // 2 - l
    except Exception:
        w, _ = font.getsize(text)
        x = (W - w) // 2
    draw.text((x, y), text, font=font, fill=color)


# ----------------------------------------------------------------------------
# Background (vertical gradient + subtle vignette)
# ----------------------------------------------------------------------------
def make_background(top=NAVY, bottom=INDIGO):
    img = Image.new("RGB", (W, H), top)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return img


def add_glow(img, center, radius, color, opacity=120):
    """Add a soft radial glow at `center` to give the bg some life."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    cx, cy = center
    od.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
               fill=color + (opacity,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=120))
    img.paste(overlay, (0, 0), overlay)
    return img


# ----------------------------------------------------------------------------
# iPhone frame mockup (drawn procedurally, no asset dependency)
# ----------------------------------------------------------------------------
def draw_iphone_frame(canvas: Image.Image, x, y, width, height, screen_bg):
    """
    Draw a simplified iPhone shape at (x, y) with given outer width/height.
    Returns the (x, y, w, h) of the inner screen area where content can be drawn.
    """
    radius = int(width * 0.12)
    border = 12
    # Outer device body
    body = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle([0, 0, width, height], radius=radius,
                         fill=(34, 34, 48, 255), outline=(60, 60, 75, 255), width=4)
    # Inner screen
    bd.rounded_rectangle([border, border, width - border, height - border],
                         radius=radius - 4, fill=screen_bg + (255,))
    # Dynamic island (rounded pill)
    island_w, island_h = int(width * 0.30), int(width * 0.062)
    island_x = (width - island_w) // 2
    island_y = int(height * 0.020) + border
    bd.rounded_rectangle(
        [island_x, island_y, island_x + island_w, island_y + island_h],
        radius=island_h // 2, fill=(0, 0, 0, 255)
    )
    canvas.paste(body, (x, y), body)
    inner_x = x + border
    inner_y = y + border
    inner_w = width - 2 * border
    inner_h = height - 2 * border
    return inner_x, inner_y, inner_w, inner_h


# ----------------------------------------------------------------------------
# Game tower rendering (used inside iPhone screens)
# ----------------------------------------------------------------------------
def draw_tower(draw, palette, area, n_blocks=10, taper=0.04, base_width_pct=0.62,
               max_block_height=None):
    """Render a tapered tower of blocks in the given screen area (x, y, w, h)."""
    sx, sy, sw, sh = area
    block_h = max_block_height or int(sh * 0.045)
    base_w = int(sw * base_width_pct)
    cx = sx + sw // 2
    bottom_y = int(sy + sh * 0.92) - block_h
    for i in range(n_blocks):
        w = max(int(base_w * (1 - i * taper)), int(sw * 0.18))
        y = bottom_y - i * block_h
        x1 = cx - w // 2
        x2 = cx + w // 2
        color = palette[i % len(palette)]
        # Block body
        draw.rounded_rectangle(
            [x1, y, x2, y + int(block_h * 0.85)],
            radius=int(block_h * 0.30),
            fill=color
        )
        # Highlight strip on top (3D feel)
        draw.rounded_rectangle(
            [x1 + 6, y + 4, x2 - 6, y + int(block_h * 0.30)],
            radius=int(block_h * 0.18),
            fill=tuple(min(c + 50, 255) for c in color)
        )


def draw_score(draw, score_text, area, color=WHITE, label="SCORE"):
    """Draw a SCORE label + big number at the top of the screen area."""
    sx, sy, sw, sh = area
    label_font = get_font(28, bold=True)
    score_font = get_font(120, bold=True)
    # Label
    try:
        l, t, r, b = draw.textbbox((0, 0), label, font=label_font)
        lw = r - l
        draw.text((sx + (sw - lw) // 2, sy + int(sh * 0.06)), label,
                  font=label_font, fill=(180, 180, 200))
    except Exception:
        pass
    # Score
    try:
        l, t, r, b = draw.textbbox((0, 0), score_text, font=score_font)
        sw_text = r - l
        draw.text((sx + (sw - sw_text) // 2, sy + int(sh * 0.10)), score_text,
                  font=score_font, fill=color)
    except Exception:
        pass


# ----------------------------------------------------------------------------
# Common header (headline + subtitle at top of marketing screenshot)
# ----------------------------------------------------------------------------
def draw_header(draw, headline, subtitle, max_size=140, min_size=70, margin=90):
    """Draw the marketing header with an auto-fitted headline.

    Why: headline strings vary in length (e.g. "STACK HIGHER" vs
    "GLOBAL LEADERBOARDS"). A fixed font size overflows the canvas and
    truncates the text on render. We pick the largest size <= max_size
    whose rendered width fits within (W - 2*margin).
    """
    max_w = W - 2 * margin
    size = max_size
    headline_font = get_font(size, bold=True)
    while size > min_size:
        headline_font = get_font(size, bold=True)
        l, t, r, b = draw.textbbox((0, 0), headline, font=headline_font)
        if (r - l) <= max_w:
            break
        size -= 4
    subtitle_font = get_font(52, bold=False)
    draw_centered(draw, headline, int(H * 0.10), headline_font, WHITE)
    draw_centered(draw, subtitle, int(H * 0.165), subtitle_font, LAVENDER)


# ----------------------------------------------------------------------------
# Screen 1 — STACK HIGHER (hero shot, tall tower in phone)
# ----------------------------------------------------------------------------
def screenshot_1():
    img = make_background(NAVY, INDIGO)
    img = add_glow(img, (W // 2, int(H * 0.55)), 600, ACCENT, opacity=80)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "STACK HIGHER", "One tap. One block. One chance.")

    # iPhone frame
    fw = int(W * 0.78)
    fh = int(fw * 2.165)  # iPhone aspect ratio
    fx = (W - fw) // 2
    fy = int(H * 0.235)
    inner = draw_iphone_frame(img, fx, fy, fw, fh, screen_bg=(26, 26, 46))

    pdraw = ImageDraw.Draw(img)
    draw_score(pdraw, "42", inner, color=WHITE)
    # Tall tower (14 blocks: previous 18 covered the score readout)
    draw_tower(pdraw, CLASSIC_PALETTE, inner, n_blocks=14, taper=0.025,
               base_width_pct=0.70)
    return img


# ----------------------------------------------------------------------------
# Screen 2 — UNLOCK 7 THEMES (mini towers in a grid)
# ----------------------------------------------------------------------------
def screenshot_2():
    img = make_background(NAVY, INDIGO)
    img = add_glow(img, (int(W * 0.30), int(H * 0.65)), 500,
                   (167, 139, 250), opacity=80)
    img = add_glow(img, (int(W * 0.75), int(H * 0.75)), 500,
                   (78, 205, 196), opacity=70)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "7 THEMES TO UNLOCK", "Sunset · Ocean · Forest · Neon · Galaxy")

    # 7 mini-cards in a 2-3-2 layout (or 3+4)
    theme_order = ['classic', 'sunset', 'ocean', 'forest', 'neon', 'monochrome', 'galaxy']
    theme_names = {
        'classic': 'Classic', 'sunset': 'Sunset', 'ocean': 'Ocean',
        'forest': 'Forest', 'neon': 'Neon', 'monochrome': 'Mono', 'galaxy': 'Galaxy',
    }

    # Layout: 4 themes on top row, 3 on bottom row.
    # card_w must fit the longest row (4 cards) within the canvas margin.
    row1 = theme_order[:4]
    row2 = theme_order[4:]
    margin = int(W * 0.04)
    gap = int(W * 0.028)
    card_w = (W - 2 * margin - 3 * gap) // 4
    card_h = int(card_w * 1.30)

    def draw_row(themes, y):
        total_w = len(themes) * card_w + (len(themes) - 1) * gap
        x = (W - total_w) // 2
        for theme_id in themes:
            palette = THEME_PALETTES[theme_id]
            # Card bg
            draw.rounded_rectangle(
                [x, y, x + card_w, y + card_h],
                radius=40, fill=(28, 28, 50), outline=(60, 60, 85), width=2,
            )
            # Mini tower inside card
            tower_area = (x + 20, y + 20, card_w - 40, int(card_h * 0.78))
            draw_tower(draw, palette, tower_area, n_blocks=6, taper=0.07,
                       base_width_pct=0.72,
                       max_block_height=int(card_h * 0.085))
            # Theme name
            name_font = get_font(46, bold=True)
            try:
                l, t, r, b = draw.textbbox((0, 0), theme_names[theme_id], font=name_font)
                tw = r - l
                draw.text((x + (card_w - tw) // 2, y + card_h - 80),
                          theme_names[theme_id], font=name_font, fill=WHITE)
            except Exception:
                pass
            x += card_w + gap

    draw_row(row1, int(H * 0.255))
    draw_row(row2, int(H * 0.255) + card_h + gap)

    return img


# ----------------------------------------------------------------------------
# Screen 3 — 5 DIFFICULTY MODES (stacked feature cards)
# ----------------------------------------------------------------------------
def screenshot_3():
    img = make_background(NAVY, INDIGO)
    img = add_glow(img, (W // 2, int(H * 0.6)), 700, ACCENT, opacity=70)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "5 DIFFICULTY MODES", "From Chill to Insane — choose your tier")

    modes = [
        ("CHILL", "Bigger blocks, slower pace", (78, 205, 196)),
        ("CLASSIC", "The original — main leaderboard", (108, 92, 231)),
        ("HARD", "Faster, narrower — separate score", (251, 113, 133)),
        ("INSANE", "Expert tier, brutal pace", (192, 132, 252)),
        ("ZEN", "No game over, infinite stack", (149, 224, 108)),
    ]
    card_w = int(W * 0.84)
    card_h = int(H * 0.085)
    gap = 36
    x = (W - card_w) // 2
    y = int(H * 0.27)
    name_font = get_font(72, bold=True)
    desc_font = get_font(38, bold=False)

    for name, desc, accent in modes:
        # Card body
        draw.rounded_rectangle([x, y, x + card_w, y + card_h], radius=44,
                               fill=(28, 28, 50), outline=accent, width=4)
        # Mode name (left)
        draw.text((x + 50, y + 20), name, font=name_font, fill=accent)
        # Description (below name)
        draw.text((x + 50, y + 110), desc, font=desc_font, fill=LAVENDER)
        # Difficulty pip indicator (right)
        pip_x = x + card_w - 40
        pip_y = y + card_h // 2
        for i in range(5):
            on = i < {"CHILL": 1, "CLASSIC": 2, "HARD": 3, "INSANE": 5, "ZEN": 0}.get(name, 0)
            color = accent if on else (60, 60, 85)
            r = 12
            cx = pip_x - i * 32
            draw.ellipse([cx - r, pip_y - r, cx + r, pip_y + r], fill=color)
        y += card_h + gap

    return img


# ----------------------------------------------------------------------------
# Screen 4 — PERFECT YOUR STACK (gold streak effect)
# ----------------------------------------------------------------------------
def screenshot_4():
    img = make_background(NAVY, INDIGO)
    img = add_glow(img, (W // 2, int(H * 0.55)), 700, GOLD, opacity=110)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "PERFECT YOUR STACK", "Land flush blocks for streak bonuses")

    # iPhone frame
    fw = int(W * 0.78)
    fh = int(fw * 2.165)
    fx = (W - fw) // 2
    fy = int(H * 0.235)
    inner = draw_iphone_frame(img, fx, fy, fw, fh, screen_bg=(26, 26, 46))

    pdraw = ImageDraw.Draw(img)

    # Tower
    draw_tower(pdraw, CLASSIC_PALETTE, inner, n_blocks=12, taper=0.0,
               base_width_pct=0.62)

    # PERFECT x5 banner overlay (gold)
    perfect_font = get_font(110, bold=True)
    text = "PERFECT x5"
    sx, sy, sw, sh = inner
    try:
        l, t, r, b = pdraw.textbbox((0, 0), text, font=perfect_font)
        tw = r - l
        # Glow background
        for off in range(8, 0, -1):
            alpha = 30
            color = (*GOLD, alpha)
            # Use stroke effect by drawing slightly offset multiple times
            pass
        pdraw.text((sx + (sw - tw) // 2, sy + int(sh * 0.34)), text,
                   font=perfect_font, fill=GOLD)
    except Exception:
        pass

    # Score
    score_font = get_font(80, bold=True)
    score = "47"
    try:
        l, t, r, b = pdraw.textbbox((0, 0), score, font=score_font)
        tw = r - l
        pdraw.text((sx + (sw - tw) // 2, sy + int(sh * 0.10)), score,
                   font=score_font, fill=WHITE)
    except Exception:
        pass

    # Particles around the perfect strike (small gold dots)
    import random
    random.seed(42)
    for _ in range(40):
        px = sx + random.randint(int(sw * 0.10), int(sw * 0.90))
        py = sy + int(sh * 0.40) + random.randint(-80, 80)
        r = random.randint(4, 12)
        pdraw.ellipse([px - r, py - r, px + r, py + r], fill=GOLD)

    return img


# ----------------------------------------------------------------------------
# Screen 5 — CLIMB THE LEADERBOARDS (mock Game Center)
# ----------------------------------------------------------------------------
def screenshot_5():
    img = make_background(NAVY, INDIGO)
    img = add_glow(img, (W // 2, int(H * 0.5)), 600, GOLD, opacity=90)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "GLOBAL LEADERBOARDS", "Compete with players worldwide")

    # iPhone frame
    fw = int(W * 0.82)
    fh = int(fw * 1.95)
    fx = (W - fw) // 2
    fy = int(H * 0.235)
    inner = draw_iphone_frame(img, fx, fy, fw, fh, screen_bg=(20, 20, 40))

    pdraw = ImageDraw.Draw(img)
    sx, sy, sw, sh = inner

    # Game Center title
    title_font = get_font(50, bold=True)
    pdraw.text((sx + 50, sy + 60), "Best Score", font=title_font, fill=WHITE)
    sub_font = get_font(34, bold=False)
    pdraw.text((sx + 50, sy + 130), "All Time · Global", font=sub_font,
               fill=(150, 150, 180))

    # Top 5 entries
    entries = [
        ("1", "Marcus.K", "247", GOLD),
        ("2", "Léa_92", "203", (192, 192, 192)),
        ("3", "Pierre", "188", (205, 127, 50)),
        ("4", "You", "175", ACCENT),
        ("5", "TokyoStacker", "164", (150, 150, 180)),
    ]
    row_h = 130
    row_x = sx + 40
    row_w = sw - 80
    y_cursor = sy + 220
    name_font = get_font(50, bold=True)
    score_font = get_font(60, bold=True)
    rank_font = get_font(56, bold=True)
    for rank, name, score, accent in entries:
        # Row bg (highlight if "You")
        if name == "You":
            pdraw.rounded_rectangle(
                [row_x, y_cursor, row_x + row_w, y_cursor + row_h - 14],
                radius=24, fill=(60, 25, 40), outline=ACCENT, width=3
            )
        # Rank number
        pdraw.text((row_x + 30, y_cursor + 30), rank,
                   font=rank_font, fill=accent)
        # Name
        pdraw.text((row_x + 130, y_cursor + 36), name,
                   font=name_font, fill=WHITE)
        # Score
        try:
            l, t, r, b = pdraw.textbbox((0, 0), score, font=score_font)
            sw_text = r - l
            pdraw.text((row_x + row_w - sw_text - 30, y_cursor + 24),
                       score, font=score_font, fill=accent)
        except Exception:
            pass
        y_cursor += row_h
        # Divider
        pdraw.line([row_x + 20, y_cursor - 4, row_x + row_w - 20, y_cursor - 4],
                   fill=(50, 50, 75), width=2)

    return img


# ----------------------------------------------------------------------------
# Screen 6 — 13 ACHIEVEMENTS (uses real assets)
# ----------------------------------------------------------------------------
def screenshot_6():
    img = make_background(NAVY, INDIGO)
    img = add_glow(img, (W // 2, int(H * 0.55)), 600, (108, 92, 231), opacity=90)
    draw = ImageDraw.Draw(img)

    draw_header(draw, "13 ACHIEVEMENTS", "Master every challenge & unlock content")

    # Load achievement icons (10 v1.0 + 3 v1.1 = 13)
    ach_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "achievements")
    icon_files = sorted([f for f in os.listdir(ach_dir) if f.endswith('.png')])

    # 3-column grid, 5 rows = 15 slots, we use 13. Show 9 (3x3 fits cleanly).
    # Actually 13 won't fit nicely in a grid — show first 9 (3x3) for visual.
    icons_to_show = icon_files[:9]
    cols = 3
    rows = 3
    cell_size = int(W * 0.245)
    gap = int(W * 0.038)
    total_w = cols * cell_size + (cols - 1) * gap
    start_x = (W - total_w) // 2
    start_y = int(H * 0.275)

    for idx, fname in enumerate(icons_to_show):
        col = idx % cols
        row = idx // cols
        x = start_x + col * (cell_size + gap)
        y = start_y + row * (cell_size + gap)
        icon = Image.open(os.path.join(ach_dir, fname)).convert("RGBA")
        icon = icon.resize((cell_size, cell_size), Image.LANCZOS)
        # Round the corners for a card look
        mask = Image.new("L", (cell_size, cell_size), 0)
        md = ImageDraw.Draw(mask)
        md.rounded_rectangle([0, 0, cell_size, cell_size], radius=44, fill=255)
        img.paste(icon, (x, y), mask)

    # "+ 4 more" badge below grid
    more_font = get_font(48, bold=True)
    more_text = "+ 4 more"
    pdraw = ImageDraw.Draw(img)
    try:
        l, t, r, b = pdraw.textbbox((0, 0), more_text, font=more_font)
        tw = r - l
        pdraw.text(((W - tw) // 2, start_y + 3 * cell_size + 2 * gap + 30),
                   more_text, font=more_font, fill=LAVENDER)
    except Exception:
        pass

    return img


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
SCREENSHOTS = [
    ("screenshot-1-stack-higher", screenshot_1),
    ("screenshot-2-themes", screenshot_2),
    ("screenshot-3-modes", screenshot_3),
    ("screenshot-4-perfect", screenshot_4),
    ("screenshot-5-leaderboards", screenshot_5),
    ("screenshot-6-achievements", screenshot_6),
]


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "marketing")
    os.makedirs(out_dir, exist_ok=True)
    for name, fn in SCREENSHOTS:
        print(f"Rendering {name}...")
        img = fn()
        out_path = os.path.join(out_dir, f"{name}.png")
        img.save(out_path, "PNG", optimize=True)
        print(f"  -> {out_path}  ({os.path.getsize(out_path) // 1024} KB)")
    print("Done.")
