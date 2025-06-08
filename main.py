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

    dragging = False
    dragged_piece = None
    drag_start = None
    drag_pos = (0, 0)

    running = True
    game_over = False
    while running:
        draw_board(screen, highlight_squares)
        draw_pieces(screen, board, images)

        if dragging and dragged_piece:
            image = images[f"{dragged_piece['color']}_{dragged_piece['type']}"]
            x, y = drag_pos
            screen.blit(image, (x - TILE_SIZE // 2, y - TILE_SIZE // 2))

        if check_message:
            text = font.render(check_message, True, (255, 0, 0))
            screen.blit(text, (10, 10))

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

                if game_over:
                    board = create_starting_board()
                    current_turn = 'white'
                    check_message = ""
                    highlight_squares = []
                    game_over = False
                    last_move = None
                    continue

                if board[row][col] and board[row][col]['color'] == current_turn:
                    dragging = True
                    dragged_piece = board[row][col]
                    drag_start = (row, col)
                    drag_pos = (x, y)
                    highlight_squares = get_legal_moves(dragged_piece, row, col, board, last_move=last_move)

            elif event.type == pygame.MOUSEMOTION and dragging:
                drag_pos = pygame.mouse.get_pos()

            elif event.type == pygame.MOUSEBUTTONUP and dragging:
                dragging = False
                x, y = pygame.mouse.get_pos()
                row, col = y // TILE_SIZE, x // TILE_SIZE
                src_row, src_col = drag_start

                piece = dragged_piece
                legal_moves = get_legal_moves(piece, src_row, src_col, board, last_move=last_move)

                if (row, col) in legal_moves:
                    # En passant
                    if piece['type'] == 'pawn' and board[row][col] is None and col != src_col:
                        captured_pawn_row = row + (1 if piece['color'] == 'white' else -1)
                        board[captured_pawn_row][col] = None

                    # Castling
                    if piece['type'] == 'king' and abs(col - src_col) == 2:
                        if col == 6:
                            rook = board[src_row][7]
                            board[src_row][5] = rook
                            board[src_row][7] = None
                            rook['has_moved'] = True
                        elif col == 2:
                            rook = board[src_row][0]
                            board[src_row][3] = rook
                            board[src_row][0] = None
                            rook['has_moved'] = True

                    # Move
                    board[row][col] = piece
                    board[src_row][src_col] = None
                    piece['has_moved'] = True

                    # Promotion
                    if piece['type'] == 'pawn' and (row == 0 or row == 7):
                        piece['type'] = 'queen'

                    last_move = ((src_row, src_col), (row, col), piece.copy())
                    current_turn = 'black' if current_turn == 'white' else 'white'

                    if is_checkmate(board, current_turn):
                        check_message = f"Checkmate! {current_turn} loses."
                        game_over = True
                    elif is_in_check(board, current_turn):
                        check_message = "Check!"
                    else:
                        check_message = ""

                dragged_piece = None
                highlight_squares = []



    pygame.quit()

if __name__ == "__main__":
    main()