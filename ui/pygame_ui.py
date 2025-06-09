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

def draw_player_info(screen, layout, font, top_name, top_img, bottom_name, bottom_img):
    text_color = (255, 255, 255)
    bg_color = (20, 20, 20)  # dark gray
    icon_size = 48
    padding = 16

    # Top player bar
    top_bar = pygame.Rect(0, 0, layout.screen_width, layout.top)
    pygame.draw.rect(screen, bg_color, top_bar)

    screen.blit(top_img, (padding, (layout.top - icon_size) // 2))

    top_text = font.render(top_name, True, text_color)
    screen.blit(top_text, (
        padding + icon_size + 12,
        (layout.top - top_text.get_height()) // 2
    ))

    # Bottom player bar
    bottom_y = layout.top + layout.board_height
    bottom_bar = pygame.Rect(0, bottom_y, layout.screen_width, layout.bottom)
    pygame.draw.rect(screen, bg_color, bottom_bar)

    screen.blit(bottom_img, (padding, bottom_y + (layout.bottom - icon_size) // 2))

    bottom_text = font.render(bottom_name, True, text_color)
    screen.blit(bottom_text, (
        padding + icon_size + 12,
        bottom_y + (layout.bottom - bottom_text.get_height()) // 2
    ))
