import pygame
from ui.layout import BoardArea
from ui.pygame_ui import load_piece_images

TILE_SIZE = 80
PLAYER_NAMES = {
    "p1": "Player 1",
    "p2": "Player 2",
    "ai": "Chad AI"
}
PLAYER_PICTURES = {
    "p1": "bibi",
    "p2": "yoav",
    "ai": "chad"
}


def create_starting_board():
    board = [[None for _ in range(8)] for _ in range(8)]
    for col in range(8):
        board[1][col] = {'type': 'pawn', 'color': 'black', 'has_moved': False}
        board[6][col] = {'type': 'pawn', 'color': 'white', 'has_moved': False}
    board[0][0] = board[0][7] = {'type': 'rook', 'color': 'black', 'has_moved': False}
    board[7][0] = board[7][7] = {'type': 'rook', 'color': 'white', 'has_moved': False}
    board[0][1] = board[0][6] = {'type': 'knight', 'color': 'black', 'has_moved': False}
    board[7][1] = board[7][6] = {'type': 'knight', 'color': 'white', 'has_moved': False}
    board[0][2] = board[0][5] = {'type': 'bishop', 'color': 'black', 'has_moved': False}
    board[7][2] = board[7][5] = {'type': 'bishop', 'color': 'white', 'has_moved': False}
    board[0][3] = {'type': 'queen', 'color': 'black', 'has_moved': False}
    board[7][3] = {'type': 'queen', 'color': 'white', 'has_moved': False}
    board[0][4] = {'type': 'king', 'color': 'black', 'has_moved': False}
    board[7][4] = {'type': 'king', 'color': 'white', 'has_moved': False}
    return board


def load_player_icons():
    def load_icon(name):
        icon = pygame.image.load(f"ui/assets/players/{name}.png")
        return pygame.transform.scale(icon, (32, 32))

    return {
        "p1": load_icon(PLAYER_PICTURES["p1"]),
        "p2": load_icon(PLAYER_PICTURES["p2"]),
        "ai": load_icon(PLAYER_PICTURES["ai"])
    }


def load_game_assets(vs_ai=False, player_color="white"):
    layout = BoardArea(top=60, bottom=60, left=0, right=0, flipped=(vs_ai and player_color == "black"))
    board = create_starting_board()
    images = load_piece_images()
    icons = load_player_icons()

    # Determine top and bottom names/icons
    if vs_ai:
        top = ("Chad AI", icons["ai"])
        bottom = ("Player 1", icons["p1"])       
    else:
        top = ("Player 2", icons["p2"])
        bottom = ("Player 1", icons["p1"])

    return layout, board, images, top, bottom
