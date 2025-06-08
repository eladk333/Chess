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
                pygame.draw.rect(screen, (0, 255, 0), rect, 4)  # green outline


def draw_pieces(screen, board, images, layout=None):
    if layout is None:
        raise ValueError("draw_pieces requires a layout object")

    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece:
                key = f"{piece['color']}_{piece['type']}"  # e.g. white_queen
                img = images.get(key)
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
    # Top
    if top_img:
        screen.blit(top_img, (10, 10))
    top_text = font.render(top_name, True, (255, 255, 255))
    screen.blit(top_text, (60, 20))

    # Bottom
    if bottom_img:
        screen.blit(bottom_img, (10, layout.screen_height - layout.bottom + 10))
    bottom_text = font.render(bottom_name, True, (255, 255, 255))
    screen.blit(bottom_text, (60, layout.screen_height - layout.bottom + 20))