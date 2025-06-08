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
    bg_color = (0, 0, 0)
    img_size = 32
    padding = 10
    
    top_bar = pygame.Rect(0, 0, layout.screen_width, layout.top)
    pygame.draw.rect(screen, bg_color, top_bar)

    top_text = font.render(top_name, True, text_color)
    top_text_rect = top_text.get_rect()
    top_text_rect.topleft = (padding + img_size + padding, (layout.top - top_text.get_height()) // 2)

    screen.blit(top_img, (padding, (layout.top - img_size) // 2))
    screen.blit(top_text, top_text_rect)

    bottom_bar_top = layout.top + layout.board_height
    bottom_bar = pygame.Rect(0, bottom_bar_top, layout.screen_width, layout.bottom)
    pygame.draw.rect(screen, bg_color, bottom_bar)

    bottom_text = font.render(bottom_name, True, text_color)
    bottom_text_rect = bottom_text.get_rect()
    bottom_text_rect.topleft = (padding + img_size + padding, bottom_bar_top + (layout.bottom - bottom_text.get_height()) // 2)

    screen.blit(bottom_img, (padding, bottom_bar_top + (layout.bottom - img_size) // 2))
    screen.blit(bottom_text, bottom_text_rect)
