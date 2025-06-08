import pygame
from ui.layout import BoardArea
from ui.pygame_ui import load_piece_images
from pieces.factory import create_piece  

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
        board[1][col] = create_piece("pawn", "black")
        board[6][col] = create_piece("pawn", "white")

    board[0][0] = board[0][7] = create_piece("rook", "black")
    board[7][0] = board[7][7] = create_piece("rook", "white")
    board[0][1] = board[0][6] = create_piece("knight", "black")
    board[7][1] = board[7][6] = create_piece("knight", "white")
    board[0][2] = board[0][5] = create_piece("bishop", "black")
    board[7][2] = board[7][5] = create_piece("bishop", "white")
    board[0][3] = create_piece("queen", "black")
    board[7][3] = create_piece("queen", "white")
    board[0][4] = create_piece("king", "black")
    board[7][4] = create_piece("king", "white")

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

    # 💡 Assign each piece its image
    for row in board:
        for piece in row:
            if piece:
                key = f"{piece.color}_{piece.type_name()}"
                piece.image = images.get(key)

    # Set player names and icons
    if vs_ai:
        top = (PLAYER_NAMES["ai"], icons["ai"])
        bottom = (PLAYER_NAMES["p1"], icons["p1"])
    else:
        top = (PLAYER_NAMES["p2"], icons["p2"])
        bottom = (PLAYER_NAMES["p1"], icons["p1"])

    return layout, board, images, top, bottom
