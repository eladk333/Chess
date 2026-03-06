import pygame
import os
import math
import chess.polyglot

LIGHT = (240, 217, 181)
DARK = (181, 136, 99)

TILE_SIZE = 80  # still used for scaling images
ASSETS_PATH = os.path.join(os.path.dirname(__file__), "assets/pieces")

def draw_board(screen, highlight_squares=None, layout=None, last_move=None):
    if highlight_squares is None:
        highlight_squares = []
    if layout is None:
        raise ValueError("draw_board requires a layout object")

    for row in range(8):
        for col in range(8):
            x, y = layout.to_screen(row, col)
            rect = pygame.Rect(x, y, layout.tile_size, layout.tile_size)

            # Highlight last move squares
            if last_move and (row, col) in [last_move[0], last_move[1]]:
                pygame.draw.rect(screen, (255, 255, 100), rect)  # yellow highlight
            else:
                color = LIGHT if (row + col) % 2 == 0 else DARK
                pygame.draw.rect(screen, color, rect)


            if (row, col) in highlight_squares:
                pygame.draw.rect(screen, (0, 255, 0), rect, 4)  
    # Draw coordinates
    font = pygame.font.SysFont("Arial", 20)
    tile = layout.tile_size

    # Draw column letters
    for col in range(8):
        # If flipped, 'H' should be on the left (col 0)
        display_col = 7 - col if layout.flipped else col
        letter = font.render(chr(ord('A') + display_col), True, (0, 0, 0))
        x = layout.left + col * tile + tile // 2
        y = layout.top + 8 * tile + 5
        screen.blit(letter, letter.get_rect(center=(x, y)))

    # Draw row numbers
    for row in range(8):
        # If flipped, '1' should be at the top (row 0)
        display_row = row + 1 if layout.flipped else 8 - row
        number = font.render(str(display_row), True, (0, 0, 0))
        x = layout.left - 10
        y = layout.top + row * tile + tile // 2
        screen.blit(number, number.get_rect(center=(x, y)))


def draw_thinking_badge(screen, x, y, is_top_bar=True):
    t = pygame.time.get_ticks()

    label_font = pygame.font.SysFont("Arial", 22, bold=True)
    dot_radius = 5
    gap = 8

    # Pulsing glow
    pulse = 0.65 + 0.35 * (0.5 + 0.5 * math.sin(t * 0.008))
    glow_alpha = int(110 + 90 * pulse)

    badge_w = 180
    badge_h = 44

    badge = pygame.Surface((badge_w, badge_h), pygame.SRCALPHA)
    if is_top_bar:
        fill = (0, 255, 255, 28)
        border = (0, 255, 255, glow_alpha)
        text_color = (180, 255, 255)
        shadow_color = (0, 80, 80)
        dot_color = (0, 255, 255)
    else:
        fill = (255, 80, 80, 28)
        border = (255, 120, 120, glow_alpha)
        text_color = (255, 180, 180)
        shadow_color = (90, 0, 0)
        dot_color = (255, 90, 90)

    pygame.draw.rect(badge, fill, (0, 0, badge_w, badge_h), border_radius=17)
    pygame.draw.rect(badge, border, (0, 0, badge_w, badge_h), width=2, border_radius=17)

    screen.blit(badge, (x, y))

    text = "Thinking"
    shadow = label_font.render(text, True, shadow_color)
    label = label_font.render(text, True, text_color)
    text_x = x + 14
    text_y = y + (badge_h - label_font.get_height()) // 2
    screen.blit(shadow, (text_x + 2, text_y + 2))
    screen.blit(label, (text_x, text_y))

    # Animated three dots
    dots_start_x = x + 122
    dots_y = y + badge_h // 2
    active_count = (t // 350) % 4  # 0,1,2,3

    for i in range(3):
        r = dot_radius + (1 if i < active_count else 0)
        alpha = 255 if i < active_count else 90

        dot = pygame.Surface((20, 20), pygame.SRCALPHA)
        pygame.draw.circle(dot, (*dot_color, alpha), (10, 10), r)
        screen.blit(dot, (dots_start_x + i * (2 * dot_radius + gap), dots_y - 10))
def draw_pieces(screen, board, images, layout=None):
    if layout is None:
        raise ValueError("draw_pieces requires a layout object")

    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece:
                key = f"{piece.color}_{piece.type_name().lower()}"
                img = images.get(key)
                piece.image = img
                if img:
                    x, y = layout.to_screen(row, col)
                    screen.blit(img, (x, y))


def load_piece_images():
    images = {}
    for filename in os.listdir(ASSETS_PATH):
        if filename.endswith(".png"):
            key = filename.replace(".png", "").replace("-", "_")
            img = pygame.image.load(os.path.join(ASSETS_PATH, filename))
            img = pygame.transform.scale(img, (TILE_SIZE, TILE_SIZE))
            images[key] = img
    return images

def draw_gradient_rect(surface, rect, color1, color2):
    for y in range(rect.height):
        ratio = y / rect.height
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        pygame.draw.line(surface, (r, g, b), (rect.left, rect.top + y), (rect.right, rect.top + y))


def draw_text_with_shadow(screen, text, font, color, shadow_color, pos):
    shadow = font.render(text, True, shadow_color)
    screen.blit(shadow, (pos[0] + 2, pos[1] + 2))
    label = font.render(text, True, color)
    screen.blit(label, pos)


def draw_player_info(screen, layout, font, top_name, top_img, bottom_name, bottom_img, ai_thinking_color=None):
    padding = 20
    icon_size = 48
    name_spacing = 16 # Extracted to a variable for cleaner math later

    # Overriding the passed font with a bold variant, as you had in your original code
    display_font = pygame.font.SysFont("Arial", 32, bold=True)

    # --- TOP BAR ---
    top_bar = pygame.Rect(0, 0, layout.screen_width, layout.top)
    draw_gradient_rect(screen, top_bar, (10, 10, 40), (0, 200, 255))

    blit_circle_icon(screen, top_img, (padding, (layout.top - icon_size) // 2), icon_size)
    
    # Store the exact X/Y coordinates for the top text
    top_text_x = padding + icon_size + name_spacing
    top_text_y = (layout.top - display_font.get_height()) // 2
    
    draw_text_with_shadow(
        screen, top_name, display_font, (0, 255, 255), (0, 100, 100), (top_text_x, top_text_y)
    )

    # --- BOTTOM BAR ---
    bottom_y = layout.top + layout.board_height
    bottom_bar = pygame.Rect(0, bottom_y, layout.screen_width, layout.bottom)
    draw_gradient_rect(screen, bottom_bar, (30, 0, 0), (200, 20, 20))

    blit_circle_icon(screen, bottom_img, (padding, bottom_y + (layout.bottom - icon_size) // 2), icon_size)
    
    # Store the exact X/Y coordinates for the bottom text
    bottom_text_x = padding + icon_size + name_spacing
    bottom_text_y = bottom_y + (layout.bottom - display_font.get_height()) // 2
    
    draw_text_with_shadow(
        screen, bottom_name, display_font, (255, 80, 80), (100, 0, 0), (bottom_text_x, bottom_text_y)
    )

    # --- ANIMATED THINKING BADGE ---
    if ai_thinking_color is not None:
        if layout.flipped:
            thinking_is_top = (ai_thinking_color == 1)   
        else:
            thinking_is_top = (ai_thinking_color == 0)   

        badge_spacing = 25 # The gap between the end of the name and the start of the badge

        if thinking_is_top:
            # Calculate the precise width of the rendered text
            text_width = display_font.size(top_name)[0]
            
            # Position = Text Start + Text Width + Gap
            badge_x = top_text_x + text_width + badge_spacing
            badge_y = (layout.top - 44) // 2  # <--- Changed to 44
            
            draw_thinking_badge(screen, badge_x, badge_y, is_top_bar=True)
        else:
            text_width = display_font.size(bottom_name)[0]
            
            badge_x = bottom_text_x + text_width + badge_spacing
            badge_y = bottom_y + (layout.bottom - 44) // 2  
            
            draw_thinking_badge(screen, badge_x, badge_y, is_top_bar=False)

def blit_circle_icon(screen, img, pos, size, shadow=True):
    icon = pygame.transform.smoothscale(img, (size, size))

    # Mask into circle
    masked = pygame.Surface((size, size), pygame.SRCALPHA)
    pygame.draw.circle(masked, (255, 255, 255), (size // 2, size // 2), size // 2)
    icon.set_colorkey((0, 0, 0))
    masked.blit(icon, (0, 0), special_flags=pygame.BLEND_RGBA_MIN)

    # Soft shadow (optional)
    if shadow:
        pygame.draw.circle(screen, (0, 0, 0, 80), (pos[0] + size//2, pos[1] + size//2), size // 2 + 3)

    # Blit icon
    screen.blit(masked, pos)
