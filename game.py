import pygame
from ui.pygame_ui import draw_board, load_piece_images, draw_pieces, draw_player_info
from rules import get_legal_moves, is_checkmate, is_in_check
from ui.layout import BoardArea  
from options import show_options

TILE_SIZE = 80
AI_PICTURE = "chad"
PLAYER1_PICTURE = "bibi"
PLAYER2_PICTURE = "yoav"

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

    layout = BoardArea(top=60, bottom=60, left=0, right=0, flipped=(vs_ai and player_color == "black"))
    screen = pygame.display.set_mode((layout.screen_width, layout.screen_height))
    pygame.display.set_caption("Chess Game")

    font = pygame.font.SysFont(None, 48)
    check_message = ""
    board = create_starting_board()
    images = load_piece_images()
    options_icon = pygame.image.load("ui/assets/icons/options.jpg").convert_alpha()
    options_icon = pygame.transform.scale(options_icon, (32, 32))
    options_rect = options_icon.get_rect(topleft=(layout.screen_width - 42, 14))

    ai_icon = pygame.image.load(f"ui/assets/players/{AI_PICTURE}.png")
    ai_icon = pygame.transform.scale(ai_icon, (32, 32))
    player1_icon = pygame.image.load(f"ui/assets/players/{PLAYER1_PICTURE}.png")
    player1_icon = pygame.transform.scale(player1_icon, (32, 32))
    player2_icon = pygame.image.load(f"ui/assets/players/{PLAYER2_PICTURE}.png")
    player2_icon = pygame.transform.scale(player2_icon, (32, 32))

    if vs_ai:
        if player_color == "white":
            bottom_name, bottom_img = "Player 1", player1_icon
            top_name, top_img = "Chad ai", ai_icon
        else:
            top_name, top_img = "Chad ai", ai_icon
            bottom_name, bottom_img = "Player 1", player1_icon
    else:
        top_name, top_img = "Player 2", player2_icon
        bottom_name, bottom_img = "Player 1", player1_icon

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
        draw_board(screen, highlight_squares, layout)
        screen.blit(options_icon, options_rect)
        draw_player_info(screen, layout, font, top_name, top_img, bottom_name, bottom_img)


        if dragging and dragged_piece and drag_start:
            row, col = drag_start
            temp = board[row][col]
            board[row][col] = None
            draw_pieces(screen, board, images, layout)
            board[row][col] = temp
        else:
            draw_pieces(screen, board, images, layout)

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
                if options_rect.collidepoint(click_down_pos):                    
                    result = show_options(screen, layout)
                    if result == "restart":
                        return run_game(vs_ai, player_color)
                    elif result == "menu":
                        return  "menu"
                    continue

                square = layout.to_board(*click_down_pos)
                if square:
                    row, col = square
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
                drop_pos = pygame.mouse.get_pos()
                square = layout.to_board(*drop_pos)
                if not square:
                    dragging = False
                    drag_candidate = None
                    continue

                row, col = square

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

    return "quit"
