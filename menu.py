import pygame
from ui.layout import BoardArea  

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GREEN = (0, 128, 0)

def draw_button(screen, text, rect, font, 
    fill_color=(173, 216, 230), 
    text_color=BLACK, 
    border_color=(0, 200, 255), 
    glow_color=(0, 255, 255),
                alpha=210):  # 0 (invisible) to 255 (opaque)

    # Create a temporary surface for the button
    button_surface = pygame.Surface((rect.width + 32, rect.height + 32), pygame.SRCALPHA)

    # Draw glow on the surface
    pygame.draw.rect(button_surface, glow_color + (alpha,), button_surface.get_rect(), border_radius=16)

    # Draw border
    border_rect = pygame.Rect(8, 8, rect.width + 16, rect.height + 16)
    pygame.draw.rect(button_surface, border_color + (alpha,), border_rect, border_radius=12)

    # Draw fill (the actual button area)
    fill_rect = pygame.Rect(16, 16, rect.width, rect.height)
    pygame.draw.rect(button_surface, fill_color + (alpha,), fill_rect, border_radius=10)

    # Blit the button surface to the screen
    screen.blit(button_surface, (rect.x - 16, rect.y - 16))

    # Draw the text directly to the main screen
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
        {"size": base_size - 8,  "color": (255, 80, 80), "alpha": 255},  # center text
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

    # Load background image
    menu_bg = pygame.image.load("ui/assets/icons/menu_background.png")
    menu_bg = pygame.transform.scale(menu_bg, (layout.screen_width, layout.screen_height))
 
    # Title 
    # title_font = pygame.font.SysFont("Arial Black", 60)
    # title_label = title_font.render("Chess Game", True, (255, 255, 255))
    # title_rect = title_label.get_rect(center=(layout.screen_width // 2, layout.top + 60))
    # screen.blit(title_label, title_rect)
    title_center = (layout.screen_width // 2, layout.top)

    button_width, button_height = 300, 80
    pvp_button = pygame.Rect(
        (layout.screen_width - button_width) // 2,
        layout.top + 300,
        button_width,
        button_height
    )
    ai_button = pygame.Rect(
        (layout.screen_width - button_width) // 2,
        layout.top + 450,
        button_width,
        button_height
    )

    while True:
        screen.blit(menu_bg, (0, 0))
        draw_title(screen, "NEURAL CHESS", title_center)
        draw_button(screen, "2 Player", pvp_button, font)
        draw_button(screen, "1 Player", ai_button, font)
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

def show_color_selection(screen, font, layout):
    # Load background image
    color_bg = pygame.image.load("ui/assets/icons/white_or_black_background.png")
    color_bg = pygame.transform.scale(color_bg , (layout.screen_width, layout.screen_height))

    button_width, button_height = 150, 80
    white_button = pygame.Rect(
        layout.screen_width // 2 - 170,
        layout.top + 240,
        button_width,
        button_height
    )
    black_button = pygame.Rect(
        layout.screen_width // 2 + 20,
        layout.top + 240,
        button_width,
        button_height
    )
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
                    return ("ai", "white")
                elif black_button.collidepoint(event.pos):
                    return ("ai", "black")
                elif back_button.collidepoint(event.pos):
                        return show_menu()
                
