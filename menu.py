import pygame
from ui.layout import BoardArea  

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

def draw_button(screen, text, rect, font, 
    fill_color=(173, 216, 230), 
    text_color=BLACK, 
    border_color=(0, 200, 255), 
    glow_color=(0, 255, 255),
    alpha=210):

    button_surface = pygame.Surface((rect.width + 32, rect.height + 32), pygame.SRCALPHA)
    pygame.draw.rect(button_surface, glow_color + (alpha,), button_surface.get_rect(), border_radius=16)

    border_rect = pygame.Rect(8, 8, rect.width + 16, rect.height + 16)
    pygame.draw.rect(button_surface, border_color + (alpha,), border_rect, border_radius=12)

    fill_rect = pygame.Rect(16, 16, rect.width, rect.height)
    pygame.draw.rect(button_surface, fill_color + (alpha,), fill_rect, border_radius=10)

    screen.blit(button_surface, (rect.x - 16, rect.y - 16))

    label = font.render(text, True, text_color)
    label_rect = label.get_rect(center=rect.center)
    screen.blit(label, label_rect)

def draw_title(screen, text, center_pos):
    base_size = 100
    glow_layers = [
        {"size": base_size + 16, "color": (255, 60, 60), "alpha": 50},
        {"size": base_size + 8,  "color": (255, 100, 100), "alpha": 100},
        {"size": base_size,      "color": (255, 120, 120), "alpha": 160},
        {"size": base_size - 4,  "color": (255, 150, 150), "alpha": 200},
        {"size": base_size - 8,  "color": (255, 80, 80), "alpha": 255}, 
    ]

    for layer in glow_layers:
        font = pygame.font.SysFont("Arial Black", layer["size"])
        label = font.render(text, True, layer["color"])
        label.set_alpha(layer["alpha"])
        rect = label.get_rect(center=center_pos)
        screen.blit(label, rect)

def show_menu():
    pygame.init()
    layout = BoardArea(top=60) 
    screen = pygame.display.set_mode((layout.screen_width, layout.screen_height))
    pygame.display.set_caption("Chess Menu")
    font = pygame.font.SysFont(None, 48)

    menu_bg = pygame.image.load("ui/assets/icons/menu_background.png")
    menu_bg = pygame.transform.scale(menu_bg, (layout.screen_width, layout.screen_height))
    title_center = (layout.screen_width // 2, layout.top)

    button_width, button_height = 300, 80
    pvp_button = pygame.Rect((layout.screen_width - button_width) // 2, layout.top + 200, button_width, button_height)
    ai_button = pygame.Rect((layout.screen_width - button_width) // 2, layout.top + 350, button_width, button_height)
    zero_p_button = pygame.Rect((layout.screen_width - button_width) // 2, layout.top + 500, button_width, button_height)

    while True:
        screen.blit(menu_bg, (0, 0))
        draw_title(screen, "Chess Game", title_center)
        draw_button(screen, "2 Player", pvp_button, font)
        draw_button(screen, "1 Player", ai_button, font)
        draw_button(screen, "0 Player", zero_p_button, font)
        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return None
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if pvp_button.collidepoint(event.pos):
                    return ("pvp", None)
                elif ai_button.collidepoint(event.pos):
                    return show_color_selection(screen, font, layout)
                elif zero_p_button.collidepoint(event.pos):
                    return show_ai_vs_ai_selection(screen, font, layout)

def show_color_selection(screen, font, layout):
    color_bg = pygame.image.load("ui/assets/icons/white_or_black_background.png")
    color_bg = pygame.transform.scale(color_bg , (layout.screen_width, layout.screen_height))

    button_width, button_height = 150, 80
    white_button = pygame.Rect(layout.screen_width // 2 - 170, layout.top + 240, button_width, button_height)
    black_button = pygame.Rect(layout.screen_width // 2 + 20, layout.top + 240, button_width, button_height)
    back_button = pygame.Rect(30, layout.top + 20, 100, 50)

    while True:
        screen.blit(color_bg, (0, 0))
        label = font.render("Choose Your Side", True, (255, 255, 255))
        label_rect = label.get_rect(center=(layout.screen_width // 2, layout.top + 140))
        screen.blit(label, label_rect)

        draw_button(screen, "White", white_button, font)
        draw_button(screen, "Black", black_button, font)
        draw_button(screen, "Back", back_button, font)
        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return None
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if white_button.collidepoint(event.pos):
                    return ("pve", "white")
                elif black_button.collidepoint(event.pos):
                    return ("pve", "black")
                elif back_button.collidepoint(event.pos):
                    return show_menu()

def show_ai_vs_ai_selection(screen, font, layout):
    color_bg = pygame.image.load("ui/assets/icons/white_or_black_background.png")
    color_bg = pygame.transform.scale(color_bg , (layout.screen_width, layout.screen_height))

    button_width, button_height = 300, 80
    white_ai_button = pygame.Rect(layout.screen_width // 2 - 150, layout.top + 200, button_width, button_height)
    black_ai_button = pygame.Rect(layout.screen_width // 2 - 150, layout.top + 320, button_width, button_height)
    start_button = pygame.Rect(layout.screen_width // 2 - 100, layout.top + 480, 200, 80)
    back_button = pygame.Rect(30, layout.top + 20, 100, 50)

    ai_options = ["Minimax", "Random"]
    white_ai_idx = 0
    black_ai_idx = 0

    while True:
        screen.blit(color_bg, (0, 0))
        label = font.render("Configure AI Setup", True, (255, 255, 255))
        label_rect = label.get_rect(center=(layout.screen_width // 2, layout.top + 80))
        screen.blit(label, label_rect)

        draw_button(screen, f"White: {ai_options[white_ai_idx]}", white_ai_button, font)
        draw_button(screen, f"Black: {ai_options[black_ai_idx]}", black_ai_button, font)
        draw_button(screen, "START", start_button, font, fill_color=(50, 200, 50))
        draw_button(screen, "Back", back_button, font)
        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return None
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if white_ai_button.collidepoint(event.pos):
                    white_ai_idx = (white_ai_idx + 1) % len(ai_options)
                elif black_ai_button.collidepoint(event.pos):
                    black_ai_idx = (black_ai_idx + 1) % len(ai_options)
                elif start_button.collidepoint(event.pos):
                    return ("eve", {"white": ai_options[white_ai_idx].lower(), "black": ai_options[black_ai_idx].lower()})
                elif back_button.collidepoint(event.pos):
                    return show_menu()