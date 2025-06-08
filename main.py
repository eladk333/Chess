import pygame
from ui.pygame_ui import draw_board, load_piece_images, draw_pieces
from rules import get_legal_moves, is_checkmate, is_in_check

TILE_SIZE = 80

def create_starting_board():
    board = [[None for _ in range(8)] for _ in range(8)]

    for col in range(8):
        board[1][col] = {'type': 'pawn', 'color': 'black', 'has_moved': False}
        board[6][col] = {'type': 'pawn', 'color': 'white', 'has_moved': False}

    board[0][0] = board[0][7] = {'type': 'rook', 'color': 'black', 'has_moved': False}
    board[7][0] = board[7][7] = {'type': 'rook', 'color': 'white'}

    board[0][1] = board[0][6] = {'type': 'knight', 'color': 'black', 'has_moved': False}
    board[7][1] = board[7][6] = {'type': 'knight', 'color': 'white', 'has_moved': False}

    board[0][2] = board[0][5] = {'type': 'bishop', 'color': 'black', 'has_moved': False}
    board[7][2] = board[7][5] = {'type': 'bishop', 'color': 'white', 'has_moved': False}

    board[0][3] = {'type': 'queen', 'color': 'black', 'has_moved': False}
    board[7][3] = {'type': 'queen', 'color': 'white', 'has_moved': False}

    board[0][4] = {'type': 'king', 'color': 'black', 'has_moved': False}
    board[7][4] = {'type': 'king', 'color': 'white', 'has_moved': False}

    return board

def main():
    pygame.init()
    screen = pygame.display.set_mode((640, 640))
    pygame.display.set_caption("Chess")

    font = pygame.font.SysFont(None, 48)
    check_message = ""
    board = create_starting_board()
    images = load_piece_images()
    last_move = None

    selected = None  # (row, col)
    current_turn = 'white'

    highlight_squares = []

    running = True
    game_over = False
    while running:
        draw_board(screen, highlight_squares)
        draw_pieces(screen, board, images)
        # if check_message:
        #     text = font.render(check_message, True, (255, 0, 0))
        #     screen.blit(text, (10, 10))

        if game_over:
            restart_text = font.render("Click to Restart", True, (0, 128, 0))
            rect = restart_text.get_rect(center=(320, 320))
            pygame.draw.rect(screen, (255, 255, 255), rect.inflate(20, 10))
            screen.blit(restart_text, rect)
        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.MOUSEBUTTONDOWN:
                x, y = pygame.mouse.get_pos()
                row = y // TILE_SIZE
                col = x // TILE_SIZE

                if selected:
                    if game_over:
                        board = create_starting_board()
                        selected = None
                        current_turn = 'white'
                        check_message = ""
                        highlight_squares = []
                        game_over = False
                        continue

                    src_row, src_col = selected
                    piece = board[src_row][src_col]
                    legal_moves = get_legal_moves(piece, src_row, src_col, board, last_move=last_move)

                    if (row, col) in legal_moves:
                        # Handle castling
                        if piece['type'] == 'king' and abs(col - src_col) == 2:
                            # Kingside
                            if col == 6:
                                rook = board[src_row][7]
                                board[src_row][5] = rook
                                board[src_row][7] = None
                                rook['has_moved'] = True
                            # Queenside
                            elif col == 2:
                                rook = board[src_row][0]
                                board[src_row][3] = rook
                                board[src_row][0] = None
                                rook['has_moved'] = True

                        # En passant capture
                        if piece['type'] == 'pawn' and board[row][col] is None and col != src_col:
                            # Moved diagonally to empty square → en passant
                            captured_pawn_row = row + (1 if piece['color'] == 'white' else -1)
                            board[captured_pawn_row][col] = None

                        # Move the piece
                        board[row][col] = piece
                        board[src_row][src_col] = None
                        piece['has_moved'] = True

                        # Pawn promotion
                        if piece['type'] == 'pawn':
                            if (piece['color'] == 'white' and row == 0) or (piece['color'] == 'black' and row == 7):
                                piece['type'] = 'queen'  # Promote to queen
                        last_move = ((src_row, src_col), (row, col), piece.copy())
                        current_turn = 'black' if current_turn == 'white' else 'white'
                        # Checkmate detection
                        if is_checkmate(board, current_turn):
                            check_message = f"Checkmate! {current_turn} loses."
                            game_over = True
                        elif is_in_check(board, current_turn):
                            check_message = "Check!"
                        else:
                            check_message = ""


                    selected = None
                    highlight_squares = []

                else:
                    if board[row][col] and board[row][col]['color'] == current_turn:
                        selected = (row, col)
                        piece = board[row][col]
                        highlight_squares = get_legal_moves(piece, row, col, board, last_move=last_move)
                    else:
                        highlight_squares = []


    pygame.quit()

if __name__ == "__main__":
    main()