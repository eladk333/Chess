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

def run_game(vs_ai=False, player_color="white"):
    pygame.init()
    screen = pygame.display.set_mode((640, 640))
    pygame.display.set_caption("Chess Game")

    font = pygame.font.SysFont(None, 48)
    check_message = ""
    board = create_starting_board()
    images = load_piece_images()
    last_move = None

    selected = None
    current_turn = 'white'
    highlight_squares = []

    dragging = False
    dragged_piece = None
    drag_start = None
    drag_pos = (0, 0)
    click_down_pos = None
    drag_candidate = None

    running = True
    game_over = False
    while running:
        draw_board(screen, highlight_squares)

        if dragging and dragged_piece and drag_start:
            row, col = drag_start
            temp = board[row][col]
            board[row][col] = None
            draw_pieces(screen, board, images)
            board[row][col] = temp
        else:
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
                click_down_pos = pygame.mouse.get_pos()
                col = click_down_pos[0] // TILE_SIZE
                row = click_down_pos[1] // TILE_SIZE
                if board[row][col] and board[row][col]['color'] == current_turn:
                    drag_candidate = (row, col)

            elif event.type == pygame.MOUSEMOTION:
                if drag_candidate and not dragging:
                    dx = event.pos[0] - click_down_pos[0]
                    dy = event.pos[1] - click_down_pos[1]
                    if abs(dx) > 5 or abs(dy) > 5:
                        row, col = drag_candidate
                        dragging = True
                        dragged_piece = board[row][col]
                        drag_start = (row, col)
                        drag_pos = event.pos

                        selected = (row, col)
                        highlight_squares = get_legal_moves(dragged_piece, row, col, board, last_move=last_move)
                if dragging:
                    drag_pos = pygame.mouse.get_pos()

            elif event.type == pygame.MOUSEBUTTONUP:
                x, y = pygame.mouse.get_pos()
                row, col = y // TILE_SIZE, x // TILE_SIZE

                if dragging:
                    dragging = False
                    src_row, src_col = drag_start
                    piece = dragged_piece
                    legal_moves = get_legal_moves(piece, src_row, src_col, board, last_move=last_move)

                    if (row, col) in legal_moves:
                        if piece['type'] == 'pawn' and board[row][col] is None and col != src_col:
                            captured_pawn_row = row + (1 if piece['color'] == 'white' else -1)
                            board[captured_pawn_row][col] = None

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

                        board[row][col] = piece
                        board[src_row][src_col] = None
                        piece['has_moved'] = True

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
                    drag_start = None
                    highlight_squares = []
                    selected = None
                    click_down_pos = None
                    drag_candidate = None

                else:
                    drag_candidate = None
                    if selected:
                        src_row, src_col = selected
                        piece = board[src_row][src_col]
                        legal_moves = get_legal_moves(piece, src_row, src_col, board, last_move=last_move)

                        if (row, col) in legal_moves:
                            if piece['type'] == 'pawn' and board[row][col] is None and col != src_col:
                                captured_pawn_row = row + (1 if piece['color'] == 'white' else -1)
                                board[captured_pawn_row][col] = None

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

                            board[row][col] = piece
                            board[src_row][src_col] = None
                            piece['has_moved'] = True

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

                            selected = None
                            highlight_squares = []
                        else:
                            selected = None
                            highlight_squares = []
                    else:
                        if board[row][col] and board[row][col]['color'] == current_turn:
                            selected = (row, col)
                            highlight_squares = get_legal_moves(board[row][col], row, col, board, last_move=last_move)

    pygame.quit()

if __name__ == "__main__":
    main()
