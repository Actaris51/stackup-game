"""Generate StackUp app icon - stacking blocks game icon."""
from PIL import Image, ImageDraw
import os

def make_icon(size=1024, bg_color=(26, 26, 46), adaptive=False):
    """Create a stackup-style icon with stacked blocks."""
    img = Image.new("RGBA", (size, size), bg_color + (255,))
    draw = ImageDraw.Draw(img)

    # Palette - gradient of blues/purples/pinks like a stacking game
    # Order: bottom-to-top (larger to smaller)
    colors = [
        (251, 191, 36),    # Gold bottom (widest)
        (52, 211, 153),    # Teal
        (96, 165, 250),    # Blue
        (167, 139, 250),   # Purple
        (244, 114, 182),   # Pink top (narrowest)
    ]

    # Center the blocks. For adaptive-icon, shrink content to leave safe-zone margin.
    # For adaptive icons Android needs ~66% safe zone.
    content_ratio = 0.55 if adaptive else 0.72
    content_size = int(size * content_ratio)

    block_height = content_size // (len(colors) + 1)
    block_widths = [
        int(content_size * 0.95),
        int(content_size * 0.85),
        int(content_size * 0.72),
        int(content_size * 0.58),
        int(content_size * 0.42),
    ]

    center_x = size // 2
    start_y = (size - (block_height * len(colors))) // 2 + int(block_height * 0.3)

    corner_radius = int(block_height * 0.22)

    for i, color in enumerate(colors):
        w = block_widths[i]
        y = start_y + (i * block_height)
        x1 = center_x - w // 2
        x2 = center_x + w // 2
        y1 = y
        y2 = y + int(block_height * 0.88)

        # Draw rounded rectangle
        draw.rounded_rectangle(
            [x1, y1, x2, y2],
            radius=corner_radius,
            fill=color + (255,),
        )

        # Highlight (top portion, lighter)
        highlight = tuple(min(255, c + 40) for c in color) + (80,)
        hl_h = int((y2 - y1) * 0.35)
        draw.rounded_rectangle(
            [x1 + 8, y1 + 4, x2 - 8, y1 + hl_h],
            radius=max(2, corner_radius - 4),
            fill=highlight,
        )

    return img


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets")

    # Main icon 1024x1024
    icon = make_icon(1024, adaptive=False)
    icon.save(os.path.join(out_dir, "icon.png"))
    print("Wrote icon.png")

    # Adaptive icon (Android) - content must fit in safe zone
    adaptive = make_icon(1024, bg_color=(26, 26, 46), adaptive=True)
    adaptive.save(os.path.join(out_dir, "adaptive-icon.png"))
    print("Wrote adaptive-icon.png")

    # Splash icon - larger blocks, centered
    splash = make_icon(1024, bg_color=(26, 26, 46), adaptive=False)
    splash.save(os.path.join(out_dir, "splash-icon.png"))
    print("Wrote splash-icon.png")

    # Favicon - small version
    favicon = make_icon(1024, adaptive=False).resize((48, 48), Image.LANCZOS)
    favicon.save(os.path.join(out_dir, "favicon.png"))
    print("Wrote favicon.png")
