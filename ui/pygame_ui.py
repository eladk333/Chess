import pygame
import os

LIGHT = (240, 217, 181)
DARK = (181, 136, 99)

TILE_SIZE = 80  # still used for scaling images
ASSETS_PATH = os.path.join(os.path.dirname(__file__), "assets")


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
