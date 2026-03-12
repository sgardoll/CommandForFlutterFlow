#!/usr/bin/env python3
"""
Custom Code Connect - Homepage Design (Final Pristine Version)
Philosophy: Liminal Precision - Museum Quality Craftsmanship
"""

from PIL import Image, ImageDraw, ImageFont
import math

# Canvas dimensions (4K for maximum quality)
WIDTH = 3840
HEIGHT = 2160

# Color palette - refined Liminal Precision
VOID_BLACK = (7, 7, 9)
DEEP_CHARCOAL = (14, 14, 18)
SOFT_GRAY = (28, 28, 36)
MEDIUM_GRAY = (55, 55, 68)
LIGHT_GRAY = (120, 120, 138)
WHISPER_GRAY = (165, 165, 180)
PURE_WHITE = (254, 254, 255)

# Luminous accents
ACCENT_VIOLET = (153, 105, 255)
ACCENT_CYAN = (52, 225, 248)

# Font paths
FONT_DIR = "/Users/home/.claude/skills/canvas-design/canvas-fonts"

def create_homepage_design():
    # Create base image
    img = Image.new('RGB', (WIDTH, HEIGHT), VOID_BLACK)
    draw = ImageDraw.Draw(img)
    
    # Subtle background gradient
    for i in range(HEIGHT):
        progress = i / HEIGHT
        r = int(VOID_BLACK[0] + (DEEP_CHARCOAL[0] - VOID_BLACK[0]) * progress * 0.25)
        g = int(VOID_BLACK[1] + (DEEP_CHARCOAL[1] - VOID_BLACK[1]) * progress * 0.25)
        b = int(VOID_BLACK[2] + (DEEP_CHARCOAL[2] - VOID_BLACK[2]) * progress * 0.25)
        draw.line([(0, i), (WIDTH, i)], fill=(r, g, b))
    
    # Load fonts
    try:
        font_display = ImageFont.truetype(f"{FONT_DIR}/WorkSans-Bold.ttf", 98)
        font_heading = ImageFont.truetype(f"{FONT_DIR}/InstrumentSans-Bold.ttf", 38)
        font_body = ImageFont.truetype(f"{FONT_DIR}/InstrumentSans-Regular.ttf", 24)
        font_small = ImageFont.truetype(f"{FONT_DIR}/Jura-Light.ttf", 18)
        font_tiny = ImageFont.truetype(f"{FONT_DIR}/GeistMono-Regular.ttf", 13)
        font_code = ImageFont.truetype(f"{FONT_DIR}/JetBrainsMono-Regular.ttf", 15)
    except Exception as e:
        print(f"Font loading error: {e}")
        font_display = ImageFont.load_default()
        font_heading = font_display
        font_body = font_display
        font_small = font_display
        font_tiny = font_display
        font_code = font_display
    
    # ===== NAVIGATION =====
    nav_y = 45
    logo_x = 90
    logo_y = nav_y + 16
    
    # Logo bars
    for i in range(3):
        x_offset = i * 12
        color = ACCENT_VIOLET if i == 1 else LIGHT_GRAY
        draw.rectangle([logo_x + x_offset, logo_y, logo_x + x_offset + 7, logo_y + 20], fill=color)
    
    draw.text((logo_x + 42, logo_y - 2), "CCC", font=font_body, fill=PURE_WHITE)
    
    # Nav items
    nav_items = [("Documentation", WIDTH - 430), ("Pricing", WIDTH - 310), ("Sign In", WIDTH - 220)]
    for text, x in nav_items:
        draw.text((x, nav_y + 18), text, font=font_small, fill=LIGHT_GRAY)
    
    # CTA
    cta_x = WIDTH - 175
    draw.rounded_rectangle([cta_x, nav_y + 6, cta_x + 115, nav_y + 42], radius=8, fill=ACCENT_VIOLET)
    draw.text((cta_x + 26, nav_y + 16), "Get Started", font=font_small, fill=PURE_WHITE)
    
    # ===== HERO SECTION =====
    left_margin = 90
    hero_y = 200
    
    # Eyebrow
    draw.text((left_margin, hero_y), "VISUAL DEVELOPMENT", font=font_tiny, fill=MEDIUM_GRAY)
    
    # Headline
    headline_y = hero_y + 40
    draw.text((left_margin, headline_y), "Custom Code", font=font_display, fill=PURE_WHITE)
    draw.text((left_margin, headline_y + 105), "Connect", font=font_display, fill=PURE_WHITE)
    
    # Gradient bar
    bar_y = headline_y + 220
    bar_width = 340
    for i in range(bar_width):
        progress = i / bar_width
        r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
        g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
        b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
        draw.line([(left_margin + i, bar_y), (left_margin + i, bar_y + 3)], fill=(r, g, b))
    
    # Subhead
    sub_y = bar_y + 45
    draw.text((left_margin, sub_y), "Where AI meets FlutterFlow. Deploy custom code", font=font_body, fill=LIGHT_GRAY)
    draw.text((left_margin, sub_y + 36), "to your projects in seconds, not hours.", font=font_body, fill=LIGHT_GRAY)
    
    # ===== UI CARD =====
    card_x = left_margin
    card_y = sub_y + 90
    card_w = 640
    card_h = 340
    
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=12, 
                          fill=DEEP_CHARCOAL, outline=SOFT_GRAY, width=1)
    
    # Header
    header_h = 52
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + header_h], radius=12, fill=SOFT_GRAY)
    draw.rectangle([card_x, card_y + header_h - 12, card_x + card_w, card_y + header_h], fill=SOFT_GRAY)
    
    # Window dots
    for i, color in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse([card_x + 20 + i * 18, card_y + 18, card_x + 30 + i * 18, card_y + 28], fill=color)
    
    draw.text((card_x + 85, card_y + 14), "Deploy to FlutterFlow", font=font_small, fill=LIGHT_GRAY)
    
    # Controls
    ctrl_y = card_y + 80
    ctrl_margin = card_x + 30
    
    # Labels
    draw.text((ctrl_margin, ctrl_y - 25), "FLUTTERFLOW PROJECT", font=font_tiny, fill=MEDIUM_GRAY)
    draw.text((ctrl_margin + 280, ctrl_y - 25), "MODEL", font=font_tiny, fill=MEDIUM_GRAY)
    draw.text((ctrl_margin + 460, ctrl_y - 25), "USE OWN API KEY", font=font_tiny, fill=MEDIUM_GRAY)
    
    # Dropdown 1
    draw.rounded_rectangle([ctrl_margin, ctrl_y, ctrl_margin + 260, ctrl_y + 44], radius=7, 
                          fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    draw.text((ctrl_margin + 16, ctrl_y + 13), "Select Project", font=font_code, fill=LIGHT_GRAY)
    draw.polygon([(ctrl_margin + 240, ctrl_y + 16), (ctrl_margin + 252, ctrl_y + 16), (ctrl_margin + 246, ctrl_y + 24)], fill=LIGHT_GRAY)
    
    # Dropdown 2
    model_x = ctrl_margin + 280
    draw.rounded_rectangle([model_x, ctrl_y, model_x + 150, ctrl_y + 44], radius=7, 
                          fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    draw.text((model_x + 16, ctrl_y + 13), "GPT-4o", font=font_code, fill=LIGHT_GRAY)
    draw.polygon([(model_x + 130, ctrl_y + 16), (model_x + 142, ctrl_y + 16), (model_x + 136, ctrl_y + 24)], fill=LIGHT_GRAY)
    
    # Toggle
    toggle_x = ctrl_margin + 460
    toggle_y = ctrl_y + 10
    draw.rounded_rectangle([toggle_x, toggle_y, toggle_x + 44, toggle_y + 24], radius=12, fill=ACCENT_VIOLET)
    draw.ellipse([toggle_x + 20, toggle_y + 2, toggle_x + 42, toggle_y + 22], fill=PURE_WHITE)
    
    # Deploy button
    btn_y = ctrl_y + 75
    btn_w = 165
    btn_h = 50
    
    for i in range(btn_w):
        progress = i / btn_w
        r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
        g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
        b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
        draw.line([(ctrl_margin + i, btn_y), (ctrl_margin + i, btn_y + btn_h)], fill=(r, g, b))
    
    # Button corners overlay
    btn_overlay = Image.new('RGBA', (btn_w, btn_h), (0, 0, 0, 0))
    btn_overlay_draw = ImageDraw.Draw(btn_overlay)
    btn_overlay_draw.rounded_rectangle([0, 0, btn_w, btn_h], radius=9, fill=(255, 255, 255, 255))
    
    draw.text((ctrl_margin + 40, btn_y + 14), "Deploy Now", font=font_body, fill=PURE_WHITE)
    
    # Status
    status_x = ctrl_margin + btn_w + 22
    draw.ellipse([status_x, btn_y + 18, status_x + 14, btn_y + 32], fill=ACCENT_CYAN)
    draw.text((status_x + 20, btn_y + 14), "Ready", font=font_code, fill=LIGHT_GRAY)
    
    # Code preview
    code_y = btn_y + 80
    code_h = 100
    draw.rounded_rectangle([ctrl_margin, code_y, ctrl_margin + 580, code_y + code_h], radius=7, 
                          fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    
    draw.text((ctrl_margin + 16, code_y + 18), "import", font=font_code, fill=ACCENT_VIOLET)
    draw.text((ctrl_margin + 68, code_y + 18), "'package:flutter/material.dart';", font=font_code, fill=LIGHT_GRAY)
    draw.text((ctrl_margin + 16, code_y + 44), "class", font=font_code, fill=ACCENT_VIOLET)
    draw.text((ctrl_margin + 70, code_y + 44), "CustomWidget", font=font_code, fill=PURE_WHITE)
    draw.text((ctrl_margin + 178, code_y + 44), "extends", font=font_code, fill=ACCENT_VIOLET)
    draw.text((ctrl_margin + 248, code_y + 44), "StatelessWidget {}", font=font_code, fill=PURE_WHITE)
    
    # ===== ABSTRACT VISUAL (Right side) =====
    center_x = 1420
    center_y = 520
    
    # Concentric circles
    for i, r in enumerate([220, 190, 160, 130]):
        alpha = 255 - i * 35
        color = tuple(int(c * (alpha / 255)) for c in ACCENT_VIOLET)
        draw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], outline=color, width=2)
    
    # Inner detail - radial lines
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        x1 = center_x + math.cos(rad) * 80
        y1 = center_y + math.sin(rad) * 80
        x2 = center_x + math.cos(rad) * 130
        y2 = center_y + math.sin(rad) * 130
        draw.line([(x1, y1), (x2, y2)], fill=SOFT_GRAY, width=1)
    
    # Floating elements
    floaters = [
        (center_x - 300, center_y - 60, 50, 32),
        (center_x + 260, center_y - 120, 65, 28),
        (center_x - 160, center_y + 260, 42, 42),
        (center_x + 220, center_y + 220, 55, 30),
    ]
    
    for fx, fy, fw, fh in floaters:
        draw.rounded_rectangle([fx, fy, fx + fw, fy + fh], radius=6, fill=SOFT_GRAY, outline=MEDIUM_GRAY, width=1)
        draw.ellipse([fx + 8, fy + fy + 8, fx + 8 + 8, fy + fy + 16], fill=ACCENT_CYAN)
    
    # Connection lines
    for fx, fy, fw, fh in floaters[:2]:
        mid_x = fx + fw / 2
        mid_y = fy + fh / 2
        draw.line([(mid_x, mid_y), (center_x, center_y)], fill=MEDIUM_GRAY, width=1)
    
    # ===== FEATURE CARDS (Below UI, properly spaced) =====
    cards_y = card_y + card_h + 80
    card_w = 300
    card_h = 160
    spacing = 40
    
    features = [
        ("Auto-Select", "Projects load instantly from your FlutterFlow workspace"),
        ("One-Click Deploy", "Custom code deployed directly to your app in seconds"),
        ("Model Freedom", "Choose your AI model or bring your own API key"),
    ]
    
    for idx, (title, desc) in enumerate(features):
        cx = left_margin + idx * (card_w + spacing)
        
        draw.rounded_rectangle([cx, cards_y, cx + card_w, cards_y + card_h], radius=11, 
                              fill=DEEP_CHARCOAL, outline=SOFT_GRAY, width=1)
        
        # Gradient line
        line_y = cards_y + card_h - 4
        for i in range(card_w):
            progress = i / card_w
            r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
            g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
            b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
            draw.line([(cx + i, line_y), (cx + i, line_y + 4)], fill=(r, g, b))
        
        # Icon
        ix = cx + 25
        iy = cards_y + 25
        draw.rounded_rectangle([ix, iy, ix + 40, iy + 40], radius=9, fill=SOFT_GRAY)
        draw.rectangle([ix + 10, iy + 16, ix + 26, iy + 20], fill=ACCENT_VIOLET)
        draw.rectangle([ix + 10, iy + 24, ix + 18, iy + 28], fill=ACCENT_CYAN)
        
        # Title
        draw.text((ix + 55, iy + 6), title, font=font_heading, fill=PURE_WHITE)
        
        # Description
        dy = iy + 55
        words = desc.split()
        line = ""
        ln = 0
        for word in words:
            test = line + word + " "
            bbox = draw.textbbox((0, 0), test, font=font_small)
            if bbox[2] - bbox[0] > card_w - 50 and line:
                draw.text((ix, dy + ln * 26), line.strip(), font=font_small, fill=LIGHT_GRAY)
                line = word + " "
                ln += 1
            else:
                line = test
        if line:
            draw.text((ix, dy + ln * 26), line.strip(), font=font_small, fill=LIGHT_GRAY)
    
    # ===== FOOTER =====
    footer_y = HEIGHT - 85
    draw.line([(left_margin, footer_y), (WIDTH - left_margin, footer_y)], fill=SOFT_GRAY, width=1)
    draw.text((left_margin, footer_y + 22), "© 2026 Custom Code Connect", font=font_tiny, fill=MEDIUM_GRAY)
    
    links = ["Privacy", "Terms", "GitHub", "Twitter"]
    lx = WIDTH - 350
    for link in links:
        draw.text((lx, footer_y + 22), link, font=font_tiny, fill=LIGHT_GRAY)
        lx += 80
    
    return img

if __name__ == "__main__":
    print("Creating final pristine Custom Code Connect homepage...")
    img = create_homepage_design()
    output_path = "/Users/home/Projects/dreamflowCommandForFlutterFlow/custom_code_connect_homepage.png"
    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Final design saved to: {output_path}")
