from abc import ABC, abstractmethod
import copy

class Piece(ABC):
    def __init__(self, color):
        self.color = color
        self.has_moved = False
        self.image = None

    def __deepcopy__(self, memo):
        cls = self.__class__
        result = cls.__new__(cls)
        memo[id(self)] = result
        for k, v in self.__dict__.items():
            if k == "image":
                setattr(result, k, None)  # skip pygame.Surface
            else:
                setattr(result, k, copy.deepcopy(v, memo))
        return result

    def clone(self):
        cls = self.__class__
        new_piece = cls(self.color)
        new_piece.has_moved = self.has_moved
        return new_piece

    def type_name(self):
        return self.__class__.__name__.lower()

    def is_opponent(self, other):
        return other and other.color != self.color

    @abstractmethod
    def get_legal_moves(self, row, col, board, last_move):
        pass
