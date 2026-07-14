"""Generate the App Review screenshot for the "Remove Ads" in-app purchase.

Apple requires a review screenshot per IAP showing where/how the purchase is
offered. The real in-app "Supprimer les pubs" button only renders once the
StoreKit product exists, so for the first submission we provide a faithful
mock of the Home screen with the purchase button visible.

Run: python scripts/generate-iap-review-screenshot.py
Output: assets/marketing/iap-review-remove-ads.png (1284 x 2778)
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

W, H = 1284, 2778

NAVY = (26, 26, 46)
INDIGO = (22, 33, 62)
ACCENT = (233, 69, 96)
GOLD = (255, 215, 0)
WHITE = (255, 255, 255)
LAVENDER = (200, 181, 217)
GREY = (160, 160, 176)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"


def font(size, bold=True):
    try:
        return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)
    except Exception:
        return ImageFont.load_default()


def centered(draw, text, y, f, color):
    l, t, r, b = draw.textbbox((0, 0), text, font=f)
    draw.text(((W - (r - l)) // 2 - l, y), text, font=f, fill=color)


def background():
    img = Image.new("RGB", (W, H), NAVY)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        px_row = (
            int(NAVY[0] * (1 - t) + INDIGO[0] * t),
            int(NAVY[1] * (1 - t) + INDIGO[1] * t),
            int(NAVY[2] * (1 - t) + INDIGO[2] * t),
        )
        for x in range(W):
            px[x, y] = px_row
    return img


def rounded(draw, box, radius, **kw):
    draw.rounded_rectangle(box, radius=radius, **kw)


def main():
    img = background()
    # soft accent glow
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([W // 2 - 500, 1400, W // 2 + 500, 2400], fill=ACCENT + (60,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(160))
    img.paste(overlay, (0, 0), overlay)

    d = ImageDraw.Draw(img)

    # Title STACK + UP
    tf = font(150, bold=True)
    l1, _, r1, _ = d.textbbox((0, 0), "STACK", font=tf)
    l2, _, r2, _ = d.textbbox((0, 0), "UP", font=tf)
    w1, w2 = r1 - l1, r2 - l2
    tx = (W - (w1 + w2)) // 2
    d.text((tx, 360), "STACK", font=tf, fill=WHITE)
    d.text((tx + w1, 360), "UP", font=tf, fill=ACCENT)

    centered(d, "Tape, empile, vise juste.", 560, font(44, bold=False), LAVENDER)

    # MODE chip
    chip_w, chip_h = 460, 90
    cx = (W - chip_w) // 2
    rounded(d, [cx, 680, cx + chip_w, 680 + chip_h], 44, fill=ACCENT)
    centered(d, "⚙  MODE  CLASSIQUE  ›", 706, font(38, bold=True), WHITE)

    # PLAY button
    pb_w, pb_h = 620, 150
    px0 = (W - pb_w) // 2
    rounded(d, [px0, 900, px0 + pb_w, 900 + pb_h], 75, fill=ACCENT)
    centered(d, "PLAY", 940, font(70, bold=True), WHITE)

    # Best score
    centered(d, "MEILLEUR (CLASSIQUE)", 1130, font(34, bold=True), GREY)
    centered(d, "175", 1180, font(96, bold=True), WHITE)

    # Daily card
    dc_w = 900
    dcx = (W - dc_w) // 2
    rounded(d, [dcx, 1380, dcx + dc_w, 1560], 40, outline=ACCENT, width=4,
            fill=(28, 28, 50))
    d.text((dcx + 44, 1410), "🗓  DÉFI DU JOUR", font=font(40, bold=True), fill=WHITE)
    d.text((dcx + 44, 1475), "Un seul essai par jour ›", font=font(32, bold=False),
           fill=GREY)

    # === Remove Ads purchase button (the point of this screenshot) ===
    ra_w = 900
    rax = (W - ra_w) // 2
    ra_y = 1660
    rounded(d, [rax, ra_y, rax + ra_w, ra_y + 130], 65, outline=ACCENT, width=5,
            fill=(40, 20, 30))
    centered(d, "🚫  SUPPRIMER LES PUBS — 2,99 €", ra_y + 42,
             font(42, bold=True), ACCENT)

    # Restore link
    centered(d, "Restaurer mes achats", ra_y + 175, font(32, bold=False), GREY)

    # Leaderboards button
    lb_w = 560
    lbx = (W - lb_w) // 2
    rounded(d, [lbx, 2060, lbx + lb_w, 2170], 55, outline=GREY, width=3)
    centered(d, "🏆  CLASSEMENTS", 2092, font(38, bold=True), GREY)

    # Annotation callout pointing at the purchase button
    note_y = 2320
    centered(d, "▲", note_y, font(60, bold=True), GOLD)
    centered(d, "Achat intégré « Supprimer les pubs » (2,99 €)",
             note_y + 70, font(38, bold=True), GOLD)
    centered(d, "proposé sur l'écran d'accueil. Non consommable.",
             note_y + 125, font(34, bold=False), LAVENDER)

    out = os.path.join(os.path.dirname(__file__), "..", "assets", "marketing",
                       "iap-review-remove-ads.png")
    img.save(out, "PNG", optimize=True)
    print(f"-> {out} ({os.path.getsize(out) // 1024} KB, {W}x{H})")


if __name__ == "__main__":
    main()
