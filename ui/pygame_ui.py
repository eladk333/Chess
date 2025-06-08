import pygame
import os

TILE_SIZE = 80
BOARD_SIZE = TILE_SIZE * 8
LIGHT = (240, 217, 181)
DARK = (181, 136, 99)

ASSETS_PATH = os.path.join(os.path.dirname(__file__), "assets")

def draw_board(screen):
    for row in range(8):
        for col in range(8):
            color = LIGHT if (row + col) % 2 == 0 else DARK
            rect = pygame.Rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            pygame.draw.rect(screen, color, rect)

def load_piece_images():
    images = {}
    for filename in os.listdir(ASSETS_PATH):
        if filename.endswith(".png"):
            key = filename.replace(".png", "").replace("-", "_")
            img = pygame.image.load(os.path.join(ASSETS_PATH, filename))
            img = pygame.transform.scale(img, (TILE_SIZE, TILE_SIZE))
            images[key] = img
    return images

def draw_pieces(screen, board, images):
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece:
                key = f"{piece['color']}_{piece['type']}"  # e.g. white_queen
                img = images.get(key)
                if img:
                    screen.blit(img, (col * TILE_SIZE, row * TILE_SIZE))