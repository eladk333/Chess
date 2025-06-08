import pygame
from ui.pygame_ui import draw_board, draw_pieces, draw_player_info
from options import show_options
from ai.rl_ai import RL_AI
from game_controller import GameController
from game_setup import load_game_assets


def run_game(vs_ai=False, player_color="white"):
    pygame.init()
    
    # Load layout, board, images, and player icons
    layout, board, images, (top_name, top_img), (bottom_name, bottom_img) = load_game_assets(vs_ai, player_color)
    
    screen = pygame.display.set_mode((layout.screen_width, layout.screen_height))
    pygame.display.set_caption("Chess Game")

    font = pygame.font.SysFont(None, 48)

    # Load options icon
    raw_icon = pygame.image.load("ui/assets/icons/options.jpg").convert_alpha()
    options_icon = pygame.transform.smoothscale(raw_icon, (32, 32))
    options_rect = options_icon.get_rect(topleft=(layout.screen_width - 42, 14))

    names_and_icons = (top_name, top_img, bottom_name, bottom_img)
    ai_player = RL_AI() if vs_ai else None

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
