from pieces.pawn import Pawn
from pieces.rook import Rook
from pieces.knight import Knight
from pieces.bishop import Bishop
from pieces.queen import Queen
from pieces.king import King

def create_piece(type_name, color):
    cls_map = {
        "pawn": Pawn,
        "rook": Rook,
        "knight": Knight,
        "bishop": Bishop,
        "queen": Queen,
        "king": King,
    }
    if type_name not in cls_map:
        raise ValueError(f"Unknown piece type: {type_name}")
    return cls_map[type_name](color)
