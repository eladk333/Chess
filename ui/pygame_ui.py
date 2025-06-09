import pygame
import os

LIGHT = (240, 217, 181)
DARK = (181, 136, 99)

TILE_SIZE = 80  # still used for scaling images
ASSETS_PATH = os.path.join(os.path.dirname(__file__), "assets/pieces")

def draw_board(screen, highlight_squares=None, layout=None):
    if highlight_squares is None:
        highlight_squares = []
    if layout is None:
        raise ValueError("draw_board requires a layout object")

    for row in range(8):
        for col in range(8):
            color = LIGHT if (row + col) % 2 == 0 else DARK
            x, y = layout.to_screen(row, col)
            rect = pygame.Rect(x, y, layout.tile_size, layout.tile_size)
            pygame.draw.rect(screen, color, rect)

            if (row, col) in highlight_squares:
                pygame.draw.rect(screen, (0, 255, 0), rect, 4)  
    # Draw coordinates
    font = pygame.font.SysFont("Arial", 20)
    tile = layout.tile_size

    # Draw column letters A–H
    for col in range(8):
        letter = font.render(chr(ord('A') + col), True, (0, 0, 0))
        x = layout.left + col * tile + tile // 2
        y = layout.top + 8 * tile + 5
        screen.blit(letter, letter.get_rect(center=(x, y)))

    # Draw row numbers 8–1
    for row in range(8):
        number = font.render(str(8 - row), True, (0, 0, 0))
        x = layout.left - 10
        y = layout.top + row * tile + tile // 2
        screen.blit(number, number.get_rect(center=(x, y)))



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


def draw_player_info(screen, layout, font, top_name, top_img, bottom_name, bottom_img):
    padding = 20
    icon_size = 48

    
    font = pygame.font.SysFont("Arial", 32, bold=True)

    # TOP BAR
    top_bar = pygame.Rect(0, 0, layout.screen_width, layout.top)
    draw_gradient_rect(screen, top_bar, (10, 10, 40), (0, 200, 255))

    blit_circle_icon(screen, top_img, (padding, (layout.top - icon_size) // 2), icon_size, border_color=(0, 180, 255))
    draw_text_with_shadow(
        screen,
        top_name,
        font,
        (0, 255, 255),
        (0, 100, 100),
        (padding + icon_size + 16, (layout.top - font.get_height()) // 2)
    )

    # BOTTOM BAR
    bottom_y = layout.top + layout.board_height
    bottom_bar = pygame.Rect(0, bottom_y, layout.screen_width, layout.bottom)
    draw_gradient_rect(screen, bottom_bar, (30, 0, 0), (200, 20, 20))

    blit_circle_icon(screen, bottom_img, (padding, bottom_y + (layout.bottom - icon_size) // 2), icon_size, border_color=(220, 30, 30))
    draw_text_with_shadow(
        screen,
        bottom_name,
        font,
        (255, 80, 80),      # Cyber red
        (100, 0, 0),        # Dark red shadow
        (padding + icon_size + 16, bottom_y + (layout.bottom - font.get_height()) // 2)
    )


def blit_circle_icon(screen, img, pos, size, border_color=(0,255,255)):
    icon = pygame.transform.smoothscale(img, (size, size))

    # Create circular icon mask
    masked = pygame.Surface((size, size), pygame.SRCALPHA)
    pygame.draw.circle(masked, (255, 255, 255), (size//2, size//2), size//2)
    icon.set_colorkey((0, 0, 0))
    masked.blit(icon, (0, 0), special_flags=pygame.BLEND_RGBA_MIN)

    # Glow background
    pygame.draw.circle(screen, (0, 0, 0, 60), (pos[0] + size//2, pos[1] + size//2), size//2 + 3)

    # Add solid border ring (not pixelated)
    pygame.draw.circle(screen, border_color, (pos[0] + size//2, pos[1] + size//2), size//2 + 2, width=2)

    # Final icon draw
    screen.blit(masked, pos)
