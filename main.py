import pygame
from ui.pygame_ui import draw_board, load_piece_images, draw_pieces
from rules import get_legal_moves

TILE_SIZE = 80

def create_starting_board():
    board = [[None for _ in range(8)] for _ in range(8)]

    for col in range(8):
        board[1][col] = {'type': 'pawn', 'color': 'black'}
        board[6][col] = {'type': 'pawn', 'color': 'white'}

    board[0][0] = board[0][7] = {'type': 'rook', 'color': 'black'}
    board[7][0] = board[7][7] = {'type': 'rook', 'color': 'white'}

    board[0][1] = board[0][6] = {'type': 'knight', 'color': 'black'}
    board[7][1] = board[7][6] = {'type': 'knight', 'color': 'white'}

    board[0][2] = board[0][5] = {'type': 'bishop', 'color': 'black'}
    board[7][2] = board[7][5] = {'type': 'bishop', 'color': 'white'}

    board[0][3] = {'type': 'queen', 'color': 'black'}
    board[7][3] = {'type': 'queen', 'color': 'white'}

    board[0][4] = {'type': 'king', 'color': 'black'}
    board[7][4] = {'type': 'king', 'color': 'white'}

    return board

def main():
    pygame.init()
    screen = pygame.display.set_mode((640, 640))
    pygame.display.set_caption("Chess")

    board = create_starting_board()
    images = load_piece_images()

    selected = None  # (row, col)
    current_turn = 'white'

    running = True
    while running:
        draw_board(screen)
        draw_pieces(screen, board, images)
        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.MOUSEBUTTONDOWN:
                x, y = pygame.mouse.get_pos()
                row = y // TILE_SIZE
                col = x // TILE_SIZE

                if selected:
                    # Try to move
                    src_row, src_col = selected
                    piece = board[src_row][src_col]

                    if piece and piece['color'] == current_turn:
                        board[row][col] = piece
                        board[src_row][src_col] = None
                        current_turn = 'black' if current_turn == 'white' else 'white'

                    selected = None  # Deselect
                else:
                    # First click — select piece
                    if board[row][col] and board[row][col]['color'] == current_turn:
                        selected = (row, col)

    pygame.quit()

if __name__ == "__main__":
    main()