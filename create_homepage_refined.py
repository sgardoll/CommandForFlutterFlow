#!/usr/bin/env python3
"""
Custom Code Connect - Homepage Design (Refined)
Philosophy: Liminal Precision - Pristine Craftsmanship
"""

from PIL import Image, ImageDraw, ImageFont
import math

# Canvas dimensions (high-res for print quality)
WIDTH = 3840
HEIGHT = 2160

# Color palette - Liminal Precision
VOID_BLACK = (8, 8, 10)
DEEP_CHARCOAL = (16, 16, 20)
SOFT_GRAY = (35, 35, 42)
MEDIUM_GRAY = (65, 65, 78)
LIGHT_GRAY = (130, 130, 148)
WHISPER_GRAY = (180, 180, 195)
PURE_WHITE = (252, 252, 255)

# Luminous accent - electric violet
ACCENT_VIOLET = (147, 100, 255)
ACCENT_VIOLET_SOFT = (180, 155, 255)

# Secondary accent - cyan
ACCENT_CYAN = (45, 220, 245)
ACCENT_CYAN_SOFT = (120, 235, 255)

# Font paths
FONT_DIR = "/Users/home/.claude/skills/canvas-design/canvas-fonts"

def create_gradient_background(width, height):
    """Create subtle gradient background"""
    img = Image.new('RGB', (width, height), VOID_BLACK)
    draw = ImageDraw.Draw(img)
    
    # Subtle vertical gradient
    for i in range(height):
        progress = i / height
        r = int(VOID_BLACK[0] + (DEEP_CHARCOAL[0] - VOID_BLACK[0]) * progress * 0.3)
        g = int(VOID_BLACK[1] + (DEEP_CHARCOAL[1] - VOID_BLACK[1]) * progress * 0.3)
        b = int(VOID_BLACK[2] + (DEEP_CHARCOAL[2] - VOID_BLACK[2]) * progress * 0.3)
        draw.line([(0, i), (width, i)], fill=(r, g, b))
    
    return img

def create_homepage_design():
    # Create base image
    img = create_gradient_background(WIDTH, HEIGHT)
    draw = ImageDraw.Draw(img)
    
    # Load fonts with various weights
    try:
        font_display = ImageFont.truetype(f"{FONT_DIR}/WorkSans-Bold.ttf", 108)
        font_title = ImageFont.truetype(f"{FONT_DIR}/WorkSans-Bold.ttf", 64)
        font_heading = ImageFont.truetype(f"{FONT_DIR}/InstrumentSans-Bold.ttf", 42)
        font_body = ImageFont.truetype(f"{FONT_DIR}/InstrumentSans-Regular.ttf", 26)
        font_small = ImageFont.truetype(f"{FONT_DIR}/Jura-Light.ttf", 20)
        font_tiny = ImageFont.truetype(f"{FONT_DIR}/GeistMono-Regular.ttf", 14)
        font_code = ImageFont.truetype(f"{FONT_DIR}/JetBrainsMono-Regular.ttf", 16)
    except Exception as e:
        print(f"Font loading error: {e}")
        font_display = ImageFont.load_default()
        font_title = font_display
        font_heading = font_display
        font_body = font_display
        font_small = font_display
        font_tiny = font_display
        font_code = font_display
    
    # ===== NAVIGATION BAR =====
    nav_y = 50
    
    # Logo mark - geometric and minimal
    logo_x = 100
    logo_y = nav_y + 18
    # Three stacked rectangles
    logo_rect_w = 7
    logo_rect_h = 22
    logo_spacing = 5
    for i in range(3):
        x_offset = i * (logo_rect_w + logo_spacing)
        color = ACCENT_VIOLET if i == 1 else LIGHT_GRAY
        draw.rectangle(
            [logo_x + x_offset, logo_y, logo_x + x_offset + logo_rect_w, logo_y + logo_rect_h],
            fill=color
        )
    
    # Logo text
    draw.text((logo_x + 45, logo_y - 2), "CCC", font=font_body, fill=PURE_WHITE)
    
    # Nav links - properly spaced
    nav_items = ["Documentation", "Pricing", "Sign In"]
    nav_start_x = WIDTH - 460
    nav_spacing = 130
    for idx, item in enumerate(nav_items):
        x_pos = nav_start_x + idx * nav_spacing
        draw.text((x_pos, nav_y + 22), item, font=font_small, fill=LIGHT_GRAY)
    
    # CTA button
    cta_x = WIDTH - 200
    cta_y = nav_y + 8
    draw.rounded_rectangle([cta_x, cta_y, cta_x + 130, cta_y + 46], 
                          radius=8, fill=ACCENT_VIOLET)
    draw.text((cta_x + 32, cta_y + 13), "Get Started", font=font_small, fill=PURE_WHITE)
    
    # ===== HERO SECTION =====
    hero_y = 220
    left_margin = 100
    
    # Eyebrow text
    draw.text((left_margin, hero_y), "VISUAL DEVELOPMENT", font=font_tiny, fill=MEDIUM_GRAY)
    
    # Main headline
    headline_y = hero_y + 45
    draw.text((left_margin, headline_y), "Custom Code", font=font_display, fill=PURE_WHITE)
    draw.text((left_margin, headline_y + 115), "Connect", font=font_display, fill=PURE_WHITE)
    
    # Gradient accent bar
    gradient_bar_y = headline_y + 240
    bar_width = 360
    for i in range(bar_width):
        progress = i / bar_width
        r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
        g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
        b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
        draw.line([(left_margin + i, gradient_bar_y), (left_margin + i, gradient_bar_y + 4)], fill=(r, g, b))
    
    # Subheadline
    sub_y = gradient_bar_y + 50
    draw.text((left_margin, sub_y), "Where AI meets FlutterFlow. Deploy custom code", font=font_body, fill=LIGHT_GRAY)
    draw.text((left_margin, sub_y + 40), "to your projects in seconds, not hours.", font=font_body, fill=LIGHT_GRAY)
    
    # ===== UI MOCKUP SECTION =====
    ui_card_x = left_margin
    ui_card_y = sub_y + 100
    ui_card_w = 680
    ui_card_h = 360
    
    # Card background
    draw.rounded_rectangle([ui_card_x, ui_card_y, ui_card_x + ui_card_w, ui_card_y + ui_card_h],
                          radius=14, fill=DEEP_CHARCOAL, outline=SOFT_GRAY, width=1)
    
    # Card header
    header_h = 55
    draw.rounded_rectangle([ui_card_x, ui_card_y, ui_card_x + ui_card_w, ui_card_y + header_h],
                          radius=14, fill=SOFT_GRAY)
    # Flatten bottom of header
    draw.rectangle([ui_card_x, ui_card_y + header_h - 14, ui_card_x + ui_card_w, ui_card_y + header_h], fill=SOFT_GRAY)
    
    # Window controls
    dot_y = ui_card_y + 20
    for i, color in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse([ui_card_x + 22 + i * 20, dot_y, ui_card_x + 32 + i * 20, dot_y + 10], fill=color)
    
    # Card title
    draw.text((ui_card_x + 100, ui_card_y + 16), "Deploy to FlutterFlow", font=font_small, fill=LIGHT_GRAY)
    
    # ===== UI CONTROLS =====
    controls_y = ui_card_y + 85
    control_margin = ui_card_x + 35
    
    # 1. Project Dropdown
    dropdown_w = 300
    dropdown_h = 48
    draw.rounded_rectangle([control_margin, controls_y, control_margin + dropdown_w, controls_y + dropdown_h],
                          radius=8, fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    draw.text((control_margin + 18, controls_y + 14), "Select Project", font=font_code, fill=LIGHT_GRAY)
    # Arrow
    arrow_x = control_margin + dropdown_w - 28
    arrow_y = controls_y + 18
    draw.polygon([(arrow_x, arrow_y), (arrow_x + 10, arrow_y), (arrow_x + 5, arrow_y + 7)], fill=LIGHT_GRAY)
    
    # Label
    draw.text((control_margin, controls_y - 28), "FLUTTERFLOW PROJECT", font=font_tiny, fill=MEDIUM_GRAY)
    
    # 2. Model Selection
    model_x = control_margin + dropdown_w + 30
    model_w = 180
    draw.rounded_rectangle([model_x, controls_y, model_x + model_w, controls_y + dropdown_h],
                          radius=8, fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    draw.text((model_x + 18, controls_y + 14), "GPT-4o", font=font_code, fill=LIGHT_GRAY)
    draw.polygon([(model_x + model_w - 28, arrow_y), (model_x + model_w - 18, arrow_y), 
                  (model_x + model_w - 23, arrow_y + 7)], fill=LIGHT_GRAY)
    draw.text((model_x, controls_y - 28), "MODEL", font=font_tiny, fill=MEDIUM_GRAY)
    
    # 3. BYOK Toggle
    byok_x = model_x + model_w + 35
    toggle_w = 48
    toggle_h = 24
    toggle_y = controls_y + 12
    # Toggle background (active)
    draw.rounded_rectangle([byok_x, toggle_y, byok_x + toggle_w, toggle_y + toggle_h],
                          radius=12, fill=ACCENT_VIOLET)
    # Toggle knob
    draw.ellipse([byok_x + toggle_w - 22, toggle_y + 2, byok_x + toggle_w - 2, toggle_y + 22], fill=PURE_WHITE)
    draw.text((byok_x, controls_y - 28), "USE OWN API KEY", font=font_tiny, fill=MEDIUM_GRAY)
    
    # 4. Deploy Button
    deploy_btn_y = controls_y + 85
    deploy_btn_w = 180
    deploy_btn_h = 52
    
    # Create gradient fill
    for i in range(deploy_btn_w):
        progress = i / deploy_btn_w
        r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
        g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
        b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
        draw.line([(control_margin + i, deploy_btn_y), (control_margin + i, deploy_btn_y + deploy_btn_h)], 
                 fill=(r, g, b))
    
    # Button corners (rounded overlay)
    btn_mask = Image.new('RGBA', (deploy_btn_w, deploy_btn_h), (0, 0, 0, 0))
    btn_mask_draw = ImageDraw.Draw(btn_mask)
    btn_mask_draw.rounded_rectangle([0, 0, deploy_btn_w, deploy_btn_h], radius=10, fill=(255, 255, 255, 255))
    
    # Button text
    draw.text((control_margin + 42, deploy_btn_y + 15), "Deploy Now", font=font_body, fill=PURE_WHITE)
    
    # Status indicator
    status_x = control_margin + deploy_btn_w + 25
    draw.ellipse([status_x, deploy_btn_y + 18, status_x + 14, deploy_btn_y + 34], fill=ACCENT_CYAN)
    draw.text((status_x + 22, deploy_btn_y + 15), "Ready", font=font_code, fill=LIGHT_GRAY)
    
    # ===== CODE PREVIEW AREA =====
    code_area_y = deploy_btn_y + 90
    code_area_h = 110
    code_area_w = 610
    draw.rounded_rectangle([control_margin, code_area_y, control_margin + code_area_w, code_area_y + code_area_h],
                          radius=8, fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    
    # Code lines
    code_lines_data = [
        (("import", ACCENT_VIOLET_SOFT), (" 'package:flutter/material.dart';", LIGHT_GRAY)),
        (("class", ACCENT_VIOLET_SOFT), (" CustomWidget ", PURE_WHITE), ("extends", ACCENT_VIOLET_SOFT), (" StatelessWidget {}", PURE_WHITE)),
    ]
    
    line_y = code_area_y + 20
    line_x = control_margin + 18
    
    # Line 1
    segments = code_lines_data[0]
    current_x = line_x
    for text, color in segments:
        draw.text((current_x, line_y), text, font=font_code, fill=color)
        bbox = draw.textbbox((current_x, line_y), text, font=font_code)
        current_x = bbox[2] + 5
    
    # Line 2
    line_y += 26
    current_x = line_x
    segments = code_lines_data[1]
    for text, color in segments:
        draw.text((current_x, line_y), text, font=font_code, fill=color)
        bbox = draw.textbbox((current_x, line_y), text, font=font_code)
        current_x = bbox[2] + 5
    
    # Line 3
    line_y += 26
    draw.text((line_x, line_y), "  @override", font=font_code, fill=MEDIUM_GRAY)
    line_y += 26
    draw.text((line_x, line_y), "  Widget build(BuildContext context) {", font=font_code, fill=PURE_WHITE)
    
    # ===== RIGHT SIDE: VISUAL ABSTRACTION =====
    abs_center_x = 1550
    abs_center_y = 550
    
    # Large void circle with subtle glow
    void_radius = 260
    
    # Draw concentric rings with decreasing opacity
    for i, r in enumerate([void_radius - 60, void_radius - 40, void_radius - 20, void_radius]):
        alpha_factor = 1.0 - (i * 0.2)
        ring_color = tuple(int(c * alpha_factor) for c in ACCENT_VIOLET)
        draw.ellipse([abs_center_x - r, abs_center_y - r, abs_center_x + r, abs_center_y + r],
                     outline=ring_color, width=2 if i == 3 else 1)
    
    # Inner geometric elements
    inner_radius = 160
    for angle in range(0, 360, 30):
        rad = math.radians(angle)
        x1 = abs_center_x + math.cos(rad) * (inner_radius - 30)
        y1 = abs_center_y + math.sin(rad) * (inner_radius - 30)
        x2 = abs_center_x + math.cos(rad) * inner_radius
        y2 = abs_center_y + math.sin(rad) * inner_radius
        draw.line([(x1, y1), (x2, y2)], fill=SOFT_GRAY, width=1)
    
    # Floating code blocks around the void
    block_configs = [
        (abs_center_x - 340, abs_center_y - 80, 55, 35),
        (abs_center_x + 290, abs_center_y - 140, 70, 30),
        (abs_center_x - 180, abs_center_y + 300, 45, 45),
        (abs_center_x + 240, abs_center_y + 260, 60, 32),
    ]
    
    for bx, by, bw, bh in block_configs:
        draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=6, 
                              fill=SOFT_GRAY, outline=MEDIUM_GRAY, width=1)
        # Accent dot
        draw.ellipse([bx + 8, by + 10, bx + 15, by + 17], fill=ACCENT_CYAN)
    
    # Connecting lines to void (suggesting network/data flow)
    for bx, by, bw, bh in block_configs[:2]:
        center_x = bx + bw / 2
        center_y = by + bh / 2
        # Draw subtle connection line
        draw.line([(center_x, center_y), (abs_center_x, abs_center_y)], 
                 fill=MEDIUM_GRAY, width=1)
    
    # ===== FEATURE CARDS SECTION =====
    cards_y = 1020
    card_w = 320
    card_h = 180
    card_spacing = 50
    cards_start_x = left_margin
    
    features = [
        ("Auto-Select", "Projects load instantly from your FlutterFlow workspace"),
        ("One-Click Deploy", "Custom code deployed directly to your app"),
        ("Model Freedom", "Choose your AI model or bring your own key"),
    ]
    
    for idx, (title, desc) in enumerate(features):
        card_x = cards_start_x + idx * (card_w + card_spacing)
        
        # Card background
        draw.rounded_rectangle([card_x, cards_y, card_x + card_w, cards_y + card_h],
                              radius=12, fill=DEEP_CHARCOAL, outline=SOFT_GRAY, width=1)
        
        # Gradient accent at bottom
        line_y = cards_y + card_h - 4
        for i in range(card_w):
            progress = i / card_w
            r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
            g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
            b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
            draw.line([(card_x + i, line_y), (card_x + i, line_y + 4)], fill=(r, g, b))
        
        # Icon
        icon_x = card_x + 28
        icon_y = cards_y + 28
        draw.rounded_rectangle([icon_x, icon_y, icon_x + 44, icon_y + 44],
                              radius=10, fill=SOFT_GRAY)
        draw.rectangle([icon_x + 12, icon_y + 18, icon_x + 28, icon_y + 22], fill=ACCENT_VIOLET)
        draw.rectangle([icon_x + 12, icon_y + 26, icon_x + 20, icon_y + 30], fill=ACCENT_CYAN)
        
        # Title
        draw.text((icon_x + 60, icon_y + 8), title, font=font_heading, fill=PURE_WHITE)
        
        # Description - wrapped text
        desc_y = icon_y + 60
        words = desc.split()
        line = ""
        line_num = 0
        max_width = card_w - 56
        
        for word in words:
            test_line = line + word + " "
            bbox = draw.textbbox((0, 0), test_line, font=font_small)
            if bbox[2] - bbox[0] > max_width and line:
                draw.text((icon_x, desc_y + line_num * 28), line.strip(), font=font_small, fill=LIGHT_GRAY)
                line = word + " "
                line_num += 1
            else:
                line = test_line
        
        if line:
            draw.text((icon_x, desc_y + line_num * 28), line.strip(), font=font_small, fill=LIGHT_GRAY)
    
    # ===== FOOTER =====
    footer_y = HEIGHT - 90
    
    # Divider line
    draw.line([(left_margin, footer_y), (WIDTH - left_margin, footer_y)], fill=SOFT_GRAY, width=1)
    
    # Copyright
    draw.text((left_margin, footer_y + 25), "© 2026 Custom Code Connect", font=font_tiny, fill=MEDIUM_GRAY)
    
    # Footer links
    footer_links = ["Privacy", "Terms", "GitHub", "Twitter"]
    link_x = WIDTH - 380
    for link in footer_links:
        draw.text((link_x, footer_y + 25), link, font=font_tiny, fill=LIGHT_GRAY)
        link_x += 85
    
    # ===== SUBTLE DOT PATTERN (very minimal) =====
    # Sparse grid pattern for texture
    grid_spacing = 80
    for x in range(0, WIDTH, grid_spacing):
        for y in range(0, HEIGHT, grid_spacing):
            if (x // grid_spacing + y // grid_spacing) % 3 == 0:
                draw.point((x, y), fill=(SOFT_GRAY[0], SOFT_GRAY[1], SOFT_GRAY[2]))
    
    return img

if __name__ == "__main__":
    print("Creating refined Custom Code Connect homepage design...")
    img = create_homepage_design()
    output_path = "/Users/home/Projects/dreamflowCommandForFlutterFlow/custom_code_connect_homepage.png"
    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Design saved to: {output_path}")
