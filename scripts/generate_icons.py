import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('icons', exist_ok=True)

def create_icon(size):
    # RGBA image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer rounded rect (Netflix dark background)
    pad = max(1, size // 16)
    corner = max(3, size // 4)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=corner, fill='#141414')
    
    # Subtle border (IMDb gold highlight)
    border_w = max(1, size // 24)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=corner, outline='#F5C518', width=border_w)
    
    # Inner star / symbol in center
    cx, cy = size / 2, size / 2
    r_outer = size * 0.32
    r_inner = r_outer * 0.45
    
    import math
    star_points = []
    for i in range(10):
        angle = -math.pi / 2 + i * (math.pi / 5)
        r = r_outer if i % 2 == 0 else r_inner
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        star_points.append((x, y))
        
    draw.polygon(star_points, fill='#F5C518')
    
    # Small accent dot or letter if large enough
    if size >= 48:
        # Mini Netflix 'N' accent or red dot at bottom right
        red_r = max(3, size // 8)
        rx = size - pad - red_r
        ry = size - pad - red_r
        draw.ellipse([rx - red_r, ry - red_r, rx + red_r, ry + red_r], fill='#E50914')

    img.save(f'icons/icon-{size}.png')
    print(f'Generated icon-{size}.png ({size}x{size})')

for s in [16, 48, 128]:
    create_icon(s)
