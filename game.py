import pygame
from ui.pygame_ui import draw_board, draw_pieces, draw_player_info
from options import show_options
from ai.minmax import MinimaxAI
from ai.random_ai import RandomAI
from game_controller import GameController
from game_setup import load_game_assets

def run_game(mode="pvp", player_color="white", ai_setup=None):
    pygame.init()
    
    layout, board, images, (top_name, top_img), (bottom_name, bottom_img) = load_game_assets(mode, player_color)
    screen = pygame.display.set_mode((layout.screen_width, layout.screen_height))
    pygame.display.set_caption("Chess Game")
    font = pygame.font.SysFont(None, 48)

    raw_icon = pygame.image.load("ui/assets/icons/options.jpg").convert_alpha()
    options_icon = pygame.transform.smoothscale(raw_icon, (32, 32))
    options_rect = options_icon.get_rect(topleft=(layout.screen_width - 42, 14))
    names_and_icons = (top_name, top_img, bottom_name, bottom_img)

    # Instantiate AIs
    white_ai = None
    black_ai = None

    if mode == "pve":
        if player_color == "white":
            black_ai = MinimaxAI(depth=4)
        else:
            white_ai = MinimaxAI(depth=4)
    elif mode == "eve" and ai_setup:
        # ai_setup is a dictionary like: {"white": "minimax", "black": "random"}
        white_ai = MinimaxAI(depth=4) if ai_setup["white"] == "minimax" else RandomAI()
        black_ai = MinimaxAI(depth=4) if ai_setup["black"] == "minimax" else RandomAI()

    controller = GameController(
        board,
        layout,
        images,
        mode=mode,
        white_ai=white_ai,
        black_ai=black_ai
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
                        return run_game(mode, player_color, ai_setup)
                    elif result == "menu":
                        return "menu"
                    continue

            result = controller.handle_event(event)
            if result == "quit":
                return "quit"