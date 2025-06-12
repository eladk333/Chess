import pygame
from ui.layout import BoardArea
from ui.pygame_ui import load_piece_images
from pieces.factory import create_piece  

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


def create_starting_board():
    board = [[None for _ in range(8)] for _ in range(8)]

    # Rank 8 (row 0)
    board[0][0] = create_piece("rook", "black")
    board[0][4] = create_piece("king", "black")
    board[0][7] = create_piece("rook", "black")

    # Rank 7 (row 1)
    board[1][0] = create_piece("pawn", "black")
    board[1][2] = create_piece("pawn", "black")
    board[1][3] = create_piece("pawn", "black")
    board[1][4] = create_piece("queen", "black")
    board[1][5] = create_piece("pawn", "black")
    board[1][6] = create_piece("bishop", "black")
    board[2][0] = create_piece("bishop", "black")
    # Rank 6 (row 2)
    board[2][1] = create_piece("knight", "black")
    board[2][4] = create_piece("pawn", "black")
    board[2][5] = create_piece("knight", "black")
    board[2][6] = create_piece("pawn", "black")

    # Rank 5 (row 3)
    #board[3][0] = create_piece("pawn", "black")
    board[3][3] = create_piece("pawn", "white")
    board[3][4] = create_piece("knight", "white")
    
    board[4][1] = create_piece("pawn", "black")
    board[3][4] = create_piece("pawn", "white")

    # Rank 3 (row 5)
    board[5][2] = create_piece("knight", "white")
    board[5][5] = create_piece("queen", "white")
    board[5][7] = create_piece("pawn", "black")

    # Rank 2 (row 6)
    for col in range(8):
        if col == 3:
            board[6][col] = create_piece("bishop", "white")
        elif col == 4:
            board[6][col] = create_piece("bishop", "white")
        else:
            board[6][col] = create_piece("pawn", "white")

    # Rank 1 (row 7)
    board[7][0] = create_piece("rook", "white")
    
    board[7][4] = create_piece("king", "white")
    board[7][7] = create_piece("rook", "white")

    return board


def load_player_icons():
    def load_icon(name):
        icon = pygame.image.load(f"ui/assets/players/{name}.png").convert_alpha()
        return pygame.transform.smoothscale(icon, (48, 48))


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