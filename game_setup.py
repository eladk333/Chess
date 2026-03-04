import pygame
import chess
from ui.layout import BoardArea
from ui.pygame_ui import load_piece_images

TILE_SIZE = 80

PLAYER_NAMES = {
    "p1": "Virgin Human",
    "p2": "Benjamin Netanyahu",
    "ai": "Chad AI"
}

PLAYER_PICTURES = {
    "p1": "virgin_human",
    "p2": "bibi",
    "ai": "chad"
}

def load_player_icons():
    def load_icon(name):
        icon = pygame.image.load(f"ui/assets/players/{name}.png").convert_alpha()
        return pygame.transform.smoothscale(icon, (48, 48))

    return {
        "p1": load_icon(PLAYER_PICTURES["p1"]),
        "p2": load_icon(PLAYER_PICTURES["p2"]),
        "ai": load_icon(PLAYER_PICTURES["ai"])
    }

def load_game_assets(mode="pvp", player_color="white"):
    layout = BoardArea(top=60, bottom=60, left=0, right=0, flipped=(mode == "pve" and player_color == "black"))
    
    board = chess.Board() 
    images = load_piece_images()
    icons = load_player_icons()

    if mode == "pve":
        top = (PLAYER_NAMES["ai"], icons["ai"])
        bottom = (PLAYER_NAMES["p1"], icons["p1"])
    elif mode == "eve":
        # Both are AI!
        top = ("Black AI", icons["ai"])
        bottom = ("White AI", icons["ai"])
    else:
        top = (PLAYER_NAMES["p2"], icons["p2"])
        bottom = (PLAYER_NAMES["p1"], icons["p1"])

    return layout, board, images, top, bottom