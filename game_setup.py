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

def load_game_assets(mode="pvp", player_color="white", ai_setup=None):
    layout = BoardArea(top=60, bottom=60, left=0, right=0, flipped=(mode == "pve" and player_color == "black"))
    
    board = chess.Board()
    #board = chess.Board("1k1r4/3r4/8/4K3/8/8/8/8 w - - 0 1") # 2 rooks
    #board = chess.Board("3r4/8/3k4/8/8/3K4/8/8 w - - 0 1") # 1 rook
    #board = chess.Board("8/3K4/4P3/8/8/8/6k1/7q w - - 0 1") # Pawn about to promot
    #board = chess.Board("8/ppk5/3p4/3b4/6B1/5KP1/2P4P/8 w - - 0 1") # Needs to push pawns endgame
    images = load_piece_images()
    icons = load_player_icons()

    if mode == "pve":
        top = (PLAYER_NAMES["ai"], icons["ai"])
        bottom = (PLAYER_NAMES["p1"], icons["p1"])
    elif mode == "eve":
        if ai_setup:
            top = (f'{ai_setup["black"].capitalize()} AI', icons["ai"])
            bottom = (f'{ai_setup["white"].capitalize()} AI', icons["ai"])
        else:
            top = ("Black AI", icons["ai"])
            bottom = ("White AI", icons["ai"])
    else:
        top = (PLAYER_NAMES["p2"], icons["p2"])
        bottom = (PLAYER_NAMES["p1"], icons["p1"])

    return layout, board, images, top, bottom