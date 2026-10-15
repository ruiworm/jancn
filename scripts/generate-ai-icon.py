import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_ai_hub_icon(size=512):
    # Create base image with anti-aliasing via 2x supersampling
    scale = 2
    actual_size = size * scale
    img = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Center and radii
    cx, cy = actual_size // 2, actual_size // 2
    outer_radius = int(actual_size * 0.44)
    inner_radius = int(actual_size * 0.38)

    # 1. Background squircle / rounded rect container
    pad = int(actual_size * 0.06)
    corner_r = int(actual_size * 0.22)

    # Gradient backdrop (Dark sleek cyber blue/indigo gradient)
    # We draw subtle concentric or vertical gradient
    for y in range(pad, actual_size - pad):
        factor = (y - pad) / (actual_size - 2 * pad)
        r = int(18 * (1 - factor) + 12 * factor)
        g = int(24 * (1 - factor) + 20 * factor)
        b = int(42 * (1 - factor) + 38 * factor)
        # Gradient background

    # Base rounded rectangle with modern deep theme
    bg_color_top = (16, 24, 40, 255)       # Rich dark slate
    bg_color_bottom = (9, 14, 26, 255)     # Deep midnight

    # Draw soft outer glow
    glow_box = [pad - 10, pad - 10, actual_size - pad + 10, actual_size - pad + 10]
    draw.rounded_rectangle(glow_box, radius=corner_r + 10, fill=(30, 58, 138, 80))

    # Draw main container
    box = [pad, pad, actual_size - pad, actual_size - pad]
    draw.rounded_rectangle(box, radius=corner_r, fill=bg_color_top)

    # Add gradient overlay inside rounded rectangle
    gradient_img = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(gradient_img)
    for y in range(pad, actual_size - pad):
        t = (y - pad) / (actual_size - 2 * pad)
        # Deep blue-violet to cyan accent
        alpha = int(180 * t)
        color = (14, 165, 233, int(alpha * 0.25)) # Sky cyan highlight
        g_draw.line([(pad, y), (actual_size - pad, y)], fill=color)

    # Mask gradient to container
    mask = Image.new("L", (actual_size, actual_size), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle(box, radius=corner_r, fill=255)
    img = Image.composite(gradient_img, img, mask)
    draw = ImageDraw.Draw(img)

    # Draw refined border on container
    draw.rounded_rectangle(box, radius=corner_r, outline=(56, 189, 248, 70), width=4)

    # 2. Draw modern AI Core / Neural Orbit Symbol in the center
    # Primary accent colors: Cyan (#38bdf8), Indigo (#818cf8), Electric Blue (#2563eb)
    center_glow = (56, 189, 248, 255)

    # Central Neural Node (Glowing Circle)
    core_r = int(actual_size * 0.11)

    # Outer orbital ellipses
    orbit_pen = int(12 * scale)

    # Draw 3 interconnected orbital rings (AI Hub concept)
    angles = [0, 60, 120]
    colors = [
        (56, 189, 248, 230),  # Cyan
        (129, 140, 248, 230), # Violet/Indigo
        (99, 102, 241, 230),  # Royal Indigo
    ]

    # Ring dimensions
    rx = int(actual_size * 0.26)
    ry = int(actual_size * 0.12)

    for idx, deg in enumerate(angles):
        ring_img = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
        r_draw = ImageDraw.Draw(ring_img)
        # Draw ellipse centered
        r_box = [cx - rx, cy - ry, cx + rx, cy + ry]
        r_draw.ellipse(r_box, outline=colors[idx], width=int(14 * scale))

        # Add satellite node on each ring
        node_angle_rad = math.radians(deg * 2 + 45)
        nx = cx + int(rx * math.cos(node_angle_rad))
        ny = cy + int(ry * math.sin(node_angle_rad))
        nr = int(16 * scale)
        r_draw.ellipse([nx - nr, ny - nr, nx + nr, ny + nr], fill=(255, 255, 255, 255))

        # Rotate ring image around center
        rotated = ring_img.rotate(deg, center=(cx, cy), resample=Image.BICUBIC)
        img = Image.alpha_composite(img, rotated)
        draw = ImageDraw.Draw(img)

    # Central Core Glowing Orb
    for r_glow, a in [(core_r + 20, 40), (core_r + 10, 90), (core_r, 255)]:
        glow_layer = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
        g_draw = ImageDraw.Draw(glow_layer)
        color = (255, 255, 255, a) if r_glow == core_r else (56, 189, 248, a)
        g_draw.ellipse([cx - r_glow, cy - r_glow, cx + r_glow, cy + r_glow], fill=color)
        img = Image.alpha_composite(img, glow_layer)
        draw = ImageDraw.Draw(img)

    # Inner core pulse center
    inner_p = int(core_r * 0.55)
    draw.ellipse([cx - inner_p, cy - inner_p, cx + inner_p, cy + inner_p], fill=(14, 165, 233, 255))

    # Downsample to target size with highest quality LANCZOS
    final_img = img.resize((size, size), resample=Image.LANCZOS)
    return final_img

if __name__ == '__main__':
    icon = create_ai_hub_icon(512)
    # 1. Update src-tauri root app icon
    icon.save("src-tauri/icons/icon.png", format="PNG")
    icon.save("src-tauri/app-icon.png", format="PNG")
    # 2. Update web-app public logo
    icon.save("web-app/public/images/jan-logo.png", format="PNG")
    print("AI Hub icon generated successfully (512x512).")
