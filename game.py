import pygame
from ui.pygame_ui import draw_board, load_piece_images, draw_pieces, draw_player_info
from rules import get_legal_moves, is_checkmate, is_in_check
from ui.layout import BoardArea  
from options import show_options
from ai.random_ai import RandomAI
from ai.utils import handle_ai_turn
from game_controller import GameController




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
    board = create_starting_board()
    images = load_piece_images()    

    # Load icons
    raw_icon = pygame.image.load("ui/assets/icons/options.jpg").convert_alpha()
    options_icon = pygame.transform.smoothscale(raw_icon, (32, 32))
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

    names_and_icons = (top_name, top_img, bottom_name, bottom_img)

    ai_player = RandomAI() if vs_ai else None
    controller = GameController(
        board,
        layout,
        images,  
        vs_ai=vs_ai,
        player_color=player_color,
        ai_player=ai_player
    )

    while True:
        controller.draw(
            screen,
            draw_board_func=draw_board,
            draw_pieces_func=lambda s, b, l: draw_pieces(s, b, images, l),
            draw_players_func=draw_player_info,
            font=font,
            options_icon=options_icon,
            options_rect=options_rect,
            names_and_icons=names_and_icons,
        )

        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.MOUSEBUTTONDOWN:
                mouse_pos = pygame.mouse.get_pos()
                if options_rect.collidepoint(mouse_pos):
                    result = show_options(screen, layout)
                    if result == "restart":
                        return run_game(vs_ai, player_color)
                    elif result == "menu":
                        return "menu"
                    continue

            result = controller.handle_event(event)
            if result == "quit":
                return "quit"