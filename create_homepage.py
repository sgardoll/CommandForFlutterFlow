#!/usr/bin/env python3
"""
Custom Code Connect - Homepage Design
Philosophy: Liminal Precision
"""

from PIL import Image, ImageDraw, ImageFont
import math

# Canvas dimensions (high-res for print quality)
WIDTH = 3840
HEIGHT = 2160

# Color palette - Liminal Precision
VOID_BLACK = (10, 10, 12)
DEEP_CHARCOAL = (18, 18, 22)
SOFT_GRAY = (45, 45, 52)
MEDIUM_GRAY = (75, 75, 85)
LIGHT_GRAY = (140, 140, 155)
WHISPER_GRAY = (200, 200, 210)
PURE_WHITE = (250, 250, 252)

# Luminous accent - electric violet (FlutterFlow signature)
ACCENT_VIOLET = (139, 92, 246)
ACCENT_VIOLET_SOFT = (167, 139, 250)
ACCENT_VIOLET_GLOW = (139, 92, 246, 30)

# Secondary accent - cyan for power/developer feel
ACCENT_CYAN = (34, 211, 238)
ACCENT_CYAN_SOFT = (103, 232, 249)

# Font paths
FONT_DIR = "/Users/home/.claude/skills/canvas-design/canvas-fonts"

def create_gradient_background(width, height):
    """Create subtle gradient from void black to deep charcoal"""
    img = Image.new('RGB', (width, height), VOID_BLACK)
    draw = ImageDraw.Draw(img)
    
    # Subtle radial gradient emanating from top-right
    for i in range(height):
        progress = i / height
        r = int(VOID_BLACK[0] + (DEEP_CHARCOAL[0] - VOID_BLACK[0]) * progress * 0.5)
        g = int(VOID_BLACK[1] + (DEEP_CHARCOAL[1] - VOID_BLACK[1]) * progress * 0.5)
        b = int(VOID_BLACK[2] + (DEEP_CHARCOAL[2] - VOID_BLACK[2]) * progress * 0.5)
        draw.line([(0, i), (width, i)], fill=(r, g, b))
    
    return img

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    """Draw a rounded rectangle with precise corners"""
    x1, y1, x2, y2 = xy
    
    # Main rectangle
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_glow_circle(draw, center, radius, color, intensity=30):
    """Draw a soft glow effect"""
    x, y = center
    for i in range(intensity, 0, -2):
        alpha = int(255 * (i / intensity) * 0.1)
        r = radius + (intensity - i) * 2
        glow_color = (*color[:3], alpha)
        # Note: PIL doesn't support alpha in draw, so we simulate with color mixing

def create_homepage_design():
    # Create base image
    img = create_gradient_background(WIDTH, HEIGHT)
    draw = ImageDraw.Draw(img)
    
    # Load fonts with various weights
    try:
        font_display = ImageFont.truetype(f"{FONT_DIR}/WorkSans-Bold.ttf", 120)
        font_title = ImageFont.truetype(f"{FONT_DIR}/WorkSans-Bold.ttf", 72)
        font_heading = ImageFont.truetype(f"{FONT_DIR}/InstrumentSans-Bold.ttf", 48)
        font_body = ImageFont.truetype(f"{FONT_DIR}/InstrumentSans-Regular.ttf", 28)
        font_small = ImageFont.truetype(f"{FONT_DIR}/Jura-Light.ttf", 22)
        font_tiny = ImageFont.truetype(f"{FONT_DIR}/GeistMono-Regular.ttf", 16)
        font_code = ImageFont.truetype(f"{FONT_DIR}/JetBrainsMono-Regular.ttf", 18)
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
    nav_y = 60
    nav_height = 80
    
    # Logo mark - geometric and minimal
    logo_x = 120
    logo_y = nav_y + 20
    # Draw a precise geometric logo (three stacked rectangles suggesting code)
    logo_rect_w = 8
    logo_rect_h = 24
    logo_spacing = 6
    for i in range(3):
        x_offset = i * (logo_rect_w + logo_spacing)
        draw.rectangle(
            [logo_x + x_offset, logo_y, logo_x + x_offset + logo_rect_w, logo_y + logo_rect_h],
            fill=ACCENT_VIOLET if i == 1 else LIGHT_GRAY
        )
    
    # Logo text
    draw.text((logo_x + 50, logo_y - 5), "CCC", font=font_body, fill=PURE_WHITE)
    
    # Nav links - whispered, minimal
    nav_items = ["Documentation", "Pricing", "Sign In"]
    nav_x = WIDTH - 500
    for item in nav_items:
        draw.text((nav_x, nav_y + 25), item, font=font_small, fill=LIGHT_GRAY)
        nav_x += 140
    
    # CTA button - subtle glow
    cta_x = WIDTH - 220
    cta_y = nav_y + 15
    draw.rounded_rectangle([cta_x, cta_y, cta_x + 140, cta_y + 50], 
                          radius=8, fill=ACCENT_VIOLET)
    draw.text((cta_x + 42, cta_y + 14), "Get Started", font=font_small, fill=PURE_WHITE)
    
    # ===== HERO SECTION =====
    hero_y = 280
    
    # Eyebrow text - whisper quiet
    draw.text((120, hero_y), "VISUAL DEVELOPMENT", font=font_tiny, fill=MEDIUM_GRAY)
    
    # Main headline - bold but confident
    headline_y = hero_y + 50
    draw.text((120, headline_y), "Custom Code", font=font_display, fill=PURE_WHITE)
    draw.text((120, headline_y + 130), "Connect", font=font_display, fill=PURE_WHITE)
    
    # Gradient accent bar under headline
    gradient_bar_y = headline_y + 270
    for i in range(120):
        progress = i / 120
        r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
        g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
        b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
        draw.line([(120 + i * 3, gradient_bar_y), (120 + i * 3, gradient_bar_y + 4)], fill=(r, g, b))
    
    # Subheadline - light, refined
    sub_y = headline_y + 300
    draw.text((120, sub_y), "Where AI meets FlutterFlow. Deploy custom code", font=font_body, fill=LIGHT_GRAY)
    draw.text((120, sub_y + 45), "to your projects in seconds, not hours.", font=font_body, fill=LIGHT_GRAY)
    
    # ===== UI MOCKUP SECTION =====
    # This shows the key differentiators in a sophisticated UI card
    ui_card_x = 120
    ui_card_y = sub_y + 120
    ui_card_w = 720
    ui_card_h = 380
    
    # Card background with subtle border
    draw.rounded_rectangle([ui_card_x, ui_card_y, ui_card_x + ui_card_w, ui_card_y + ui_card_h],
                          radius=16, fill=DEEP_CHARCOAL, outline=SOFT_GRAY, width=1)
    
    # Card header
    header_h = 60
    draw.rounded_rectangle([ui_card_x, ui_card_y, ui_card_x + ui_card_w, ui_card_y + header_h],
                          radius=16, fill=SOFT_GRAY)
    # Flatten the bottom corners of header
    draw.rectangle([ui_card_x, ui_card_y + header_h - 16, ui_card_x + ui_card_w, ui_card_y + header_h], fill=SOFT_GRAY)
    
    # Window controls (minimal dots)
    dot_y = ui_card_y + 22
    for i, color in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse([ui_card_x + 24 + i * 22, dot_y, ui_card_x + 36 + i * 22, dot_y + 12], fill=color)
    
    # Card title
    draw.text((ui_card_x + 120, ui_card_y + 18), "Deploy to FlutterFlow", font=font_small, fill=LIGHT_GRAY)
    
    # ===== UI CONTROLS (showing differentiators) =====
    controls_y = ui_card_y + 90
    
    # 1. Project Dropdown (FlutterFlow project selection)
    dropdown_x = ui_card_x + 40
    dropdown_w = 320
    dropdown_h = 50
    draw.rounded_rectangle([dropdown_x, controls_y, dropdown_x + dropdown_w, controls_y + dropdown_h],
                          radius=8, fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    draw.text((dropdown_x + 20, controls_y + 15), "Select Project", font=font_code, fill=LIGHT_GRAY)
    # Dropdown arrow
    arrow_x = dropdown_x + dropdown_w - 30
    arrow_y = controls_y + 20
    draw.polygon([(arrow_x, arrow_y), (arrow_x + 10, arrow_y), (arrow_x + 5, arrow_y + 8)], fill=LIGHT_GRAY)
    
    # Label
    draw.text((dropdown_x, controls_y - 30), "FLUTTERFLOW PROJECT", font=font_tiny, fill=MEDIUM_GRAY)
    
    # 2. Model Selection (Pro & Power users)
    model_x = dropdown_x + dropdown_w + 40
    model_w = 200
    draw.rounded_rectangle([model_x, controls_y, model_x + model_w, controls_y + dropdown_h],
                          radius=8, fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    draw.text((model_x + 20, controls_y + 15), "GPT-4o", font=font_code, fill=LIGHT_GRAY)
    draw.polygon([(model_x + model_w - 30, arrow_y), (model_x + model_w - 20, arrow_y), 
                  (model_x + model_w - 25, arrow_y + 8)], fill=LIGHT_GRAY)
    draw.text((model_x, controls_y - 30), "MODEL", font=font_tiny, fill=MEDIUM_GRAY)
    
    # 3. BYOK Toggle (Power users)
    byok_x = model_x + model_w + 40
    toggle_w = 50
    toggle_h = 26
    toggle_y = controls_y + 12
    # Toggle background (active state)
    draw.rounded_rectangle([byok_x, toggle_y, byok_x + toggle_w, toggle_y + toggle_h],
                          radius=13, fill=ACCENT_VIOLET)
    # Toggle knob
    draw.ellipse([byok_x + toggle_w - 24, toggle_y + 2, byok_x + toggle_w - 2, toggle_y + 24], fill=PURE_WHITE)
    draw.text((byok_x, controls_y - 30), "USE OWN API KEY", font=font_tiny, fill=MEDIUM_GRAY)
    
    # 4. Deploy Button (Direct deployment)
    deploy_btn_y = controls_y + 90
    deploy_btn_w = 200
    deploy_btn_h = 56
    btn_gradient_start = (120, controls_y + 90)
    
    # Gradient button
    for i in range(deploy_btn_w):
        progress = i / deploy_btn_w
        r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
        g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
        b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
        draw.line([(dropdown_x + i, deploy_btn_y), (dropdown_x + i, deploy_btn_y + deploy_btn_h)], 
                 fill=(r, g, b))
    
    # Rounded corners for button
    mask = Image.new('L', (deploy_btn_w, deploy_btn_h), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, deploy_btn_w, deploy_btn_h], radius=10, fill=255)
    
    draw.rounded_rectangle([dropdown_x, deploy_btn_y, dropdown_x + deploy_btn_w, deploy_btn_y + deploy_btn_h],
                          radius=10, outline=None)
    
    # Re-draw with proper fill
    for i in range(deploy_btn_w):
        progress = i / deploy_btn_w
        r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
        g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
        b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
        draw.line([(dropdown_x + i, deploy_btn_y), (dropdown_x + i, deploy_btn_y + deploy_btn_h)], 
                 fill=(r, g, b))
    
    # Button corners
    draw.rounded_rectangle([dropdown_x, deploy_btn_y, dropdown_x + deploy_btn_w, deploy_btn_y + deploy_btn_h],
                          radius=10, outline=None)
    
    # Button text
    draw.text((dropdown_x + 55, deploy_btn_y + 16), "Deploy Now", font=font_body, fill=PURE_WHITE)
    
    # Status indicator
    status_x = dropdown_x + deploy_btn_w + 30
    draw.ellipse([status_x, deploy_btn_y + 20, status_x + 16, deploy_btn_y + 36], fill=(34, 211, 238))
    draw.text((status_x + 26, deploy_btn_y + 16), "Ready", font=font_code, fill=LIGHT_GRAY)
    
    # ===== CODE PREVIEW AREA =====
    code_area_y = deploy_btn_y + 100
    code_area_h = 120
    draw.rounded_rectangle([dropdown_x, code_area_y, dropdown_x + 640, code_area_y + code_area_h],
                          radius=8, fill=VOID_BLACK, outline=MEDIUM_GRAY, width=1)
    
    # Code lines with syntax highlighting
    code_lines = [
        ("import", (167, 139, 250)),
        (" 'package:flutter/material.dart';", LIGHT_GRAY),
        ("class", (167, 139, 250)),
        (" CustomWidget ", PURE_WHITE),
        ("extends", (167, 139, 250)),
        (" StatelessWidget {}", PURE_WHITE),
    ]
    
    line_x = dropdown_x + 20
    line_y = code_area_y + 20
    for text, color in code_lines:
        draw.text((line_x, line_y), text, font=font_code, fill=color)
        bbox = draw.textbbox((line_x, line_y), text, font=font_code)
        line_x = bbox[2] + 5
    
    # Line 2
    line_y += 28
    draw.text((dropdown_x + 20, line_y), "  @override", font=font_code, fill=MEDIUM_GRAY)
    line_y += 28
    draw.text((dropdown_x + 20, line_y), "  Widget build(BuildContext context) {", font=font_code, fill=PURE_WHITE)
    
    # ===== RIGHT SIDE: VISUAL ABSTRACTION =====
    # Abstract geometric composition representing the philosophy
    abs_x = 1000
    abs_y = 200
    
    # Large geometric form - void with subtle glow
    # Central void circle
    void_center = (abs_x + 400, abs_y + 400)
    void_radius = 280
    
    # Glow layers
    for layer in range(5):
        glow_r = void_radius + (5 - layer) * 40
        alpha_val = int(20 - layer * 4)
        # Create gradient glow effect
        for angle in range(0, 360, 5):
            rad = math.radians(angle)
            x1 = void_center[0] + math.cos(rad) * (glow_r - 20)
            y1 = void_center[1] + math.sin(rad) * (glow_r - 20)
            x2 = void_center[0] + math.cos(rad) * glow_r
            y2 = void_center[1] + math.sin(rad) * glow_r
            # Blend color
            blend = layer / 5
            r = int(ACCENT_VIOLET[0] * (1 - blend) + ACCENT_CYAN[0] * blend)
            g = int(ACCENT_VIOLET[1] * (1 - blend) + ACCENT_CYAN[1] * blend)
            b = int(ACCENT_VIOLET[2] * (1 - blend) + ACCENT_CYAN[2] * blend)
            draw.line([(x1, y1), (x2, y2)], fill=(r, g, b, alpha_val), width=2)
    
    # Main void circle
    draw.ellipse([void_center[0] - void_radius, void_center[1] - void_radius,
                  void_center[0] + void_radius, void_center[1] + void_radius],
                 fill=VOID_BLACK, outline=ACCENT_VIOLET, width=3)
    
    # Inner concentric rings - precise, architectural
    for i, r in enumerate([200, 160, 120, 80, 40]):
        alpha = 255 - i * 40
        color_val = tuple(int(c * (alpha / 255)) for c in ACCENT_VIOLET)
        draw.ellipse([void_center[0] - r, void_center[1] - r,
                      void_center[0] + r, void_center[1] + r],
                     outline=color_val, width=1)
    
    # Floating geometric elements - suggesting code structures
    # Small rectangles orbiting the void
    rect_positions = [
        (void_center[0] - 350, void_center[1] - 100, 60, 40),
        (void_center[0] + 300, void_center[1] - 150, 80, 30),
        (void_center[0] - 200, void_center[1] + 320, 50, 50),
        (void_center[0] + 250, void_center[1] + 280, 70, 35),
    ]
    
    for rx, ry, rw, rh in rect_positions:
        draw.rounded_rectangle([rx, ry, rx + rw, ry + rh], radius=6, 
                              fill=SOFT_GRAY, outline=MEDIUM_GRAY, width=1)
        # Small accent dot
        draw.ellipse([rx + 8, ry + 12, rx + 16, ry + 20], fill=ACCENT_CYAN)
    
    # ===== FEATURE CARDS SECTION =====
    cards_y = 900
    card_w = 340
    card_h = 200
    card_spacing = 60
    cards_start_x = 120
    
    features = [
        ("Auto-Select", "Projects load instantly from your FlutterFlow workspace"),
        ("One-Click Deploy", "Custom code deployed directly to your app in seconds"),
        ("Model Freedom", "Choose your AI model or bring your own API key"),
    ]
    
    for idx, (title, desc) in enumerate(features):
        card_x = cards_start_x + idx * (card_w + card_spacing)
        
        # Card with subtle hover-ready styling
        draw.rounded_rectangle([card_x, cards_y, card_x + card_w, cards_y + card_h],
                              radius=12, fill=DEEP_CHARCOAL, outline=SOFT_GRAY, width=1)
        
        # Card accent line (gradient)
        line_y = cards_y + card_h - 4
        for i in range(card_w):
            progress = i / card_w
            r = int(ACCENT_VIOLET[0] * (1 - progress) + ACCENT_CYAN[0] * progress)
            g = int(ACCENT_VIOLET[1] * (1 - progress) + ACCENT_CYAN[1] * progress)
            b = int(ACCENT_VIOLET[2] * (1 - progress) + ACCENT_CYAN[2] * progress)
            draw.line([(card_x + i, line_y), (card_x + i, line_y + 4)], fill=(r, g, b))
        
        # Icon placeholder - geometric
        icon_x = card_x + 30
        icon_y = cards_y + 30
        draw.rounded_rectangle([icon_x, icon_y, icon_x + 50, icon_y + 50],
                              radius=10, fill=SOFT_GRAY)
        # Icon detail
        draw.rectangle([icon_x + 15, icon_y + 20, icon_x + 35, icon_y + 24], fill=ACCENT_VIOLET)
        draw.rectangle([icon_x + 15, icon_y + 30, icon_x + 25, icon_y + 34], fill=ACCENT_CYAN)
        
        # Title
        draw.text((icon_x + 70, icon_y + 10), title, font=font_heading, fill=PURE_WHITE)
        
        # Description
        desc_y = icon_y + 70
        words = desc.split()
        line = ""
        line_num = 0
        for word in words:
            test_line = line + word + " "
            bbox = draw.textbbox((0, 0), test_line, font=font_small)
            if bbox[2] - bbox[0] > card_w - 60:
                draw.text((icon_x, desc_y + line_num * 32), line.strip(), font=font_small, fill=LIGHT_GRAY)
                line = word + " "
                line_num += 1
            else:
                line = test_line
        if line:
            draw.text((icon_x, desc_y + line_num * 32), line.strip(), font=font_small, fill=LIGHT_GRAY)
    
    # ===== FOOTER =====
    footer_y = HEIGHT - 100
    
    # Divider
    draw.line([(120, footer_y), (WIDTH - 120, footer_y)], fill=SOFT_GRAY, width=1)
    
    # Copyright
    draw.text((120, footer_y + 30), "© 2026 Custom Code Connect", font=font_tiny, fill=MEDIUM_GRAY)
    
    # Footer links
    footer_links = ["Privacy", "Terms", "GitHub", "Twitter"]
    link_x = WIDTH - 400
    for link in footer_links:
        draw.text((link_x, footer_y + 30), link, font=font_tiny, fill=LIGHT_GRAY)
        link_x += 90
    
    # ===== SUBTLE GRID PATTERN (background texture) =====
    # Very subtle dot grid suggesting precision and development
    grid_spacing = 60
    grid_alpha = 8
    for x in range(0, WIDTH, grid_spacing):
        for y in range(0, HEIGHT, grid_spacing):
            if (x + y) % (grid_spacing * 2) == 0:  # Sparse pattern
                draw.ellipse([x, y, x + 2, y + 2], fill=(WHISPER_GRAY[0], WHISPER_GRAY[1], WHISPER_GRAY[2]))
    
    return img

if __name__ == "__main__":
    print("Creating Custom Code Connect homepage design...")
    img = create_homepage_design()
    output_path = "/Users/home/Projects/dreamflowCommandForFlutterFlow/custom_code_connect_homepage.png"
    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Design saved to: {output_path}")
