import pygame
from ui.layout import BoardArea

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
DARK_BG = (50, 50, 50)
red_fill = (200, 50, 50)
red_border = (150, 20, 20)
red_glow = (255, 100, 100)


def draw_fancy_button(screen, text, rect, font, 
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


def show_options(screen, layout: BoardArea):
    # Load your custom background image
    background = pygame.image.load("ui/assets/icons/options_background.png")  # Replace with your actual path
    background = pygame.transform.scale(background, (layout.screen_width, layout.screen_height))

    font = pygame.font.SysFont("Arial Black", 44)

    # Buttons positions
    restart_button = pygame.Rect(layout.screen_width // 2 - 150, layout.top + 300, 300, 70)
    menu_button = pygame.Rect(layout.screen_width // 2 - 150, layout.top + 420, 300, 70)
    back_button = pygame.Rect(30, layout.top - 30, 120, 50)  # top-left small back button

    while True:
        screen.blit(background, (0, 0))

        # Dim overlay
        overlay = pygame.Surface((layout.screen_width, layout.screen_height), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 160))
        screen.blit(overlay, (0, 0))

        # Draw buttons
        draw_fancy_button(screen, "Restart Game", restart_button, font, fill_color=red_fill, border_color=red_border, glow_color=red_glow)
        draw_fancy_button(screen, "Back to Menu", menu_button, font, fill_color=red_fill, border_color=red_border, glow_color=red_glow)
        draw_fancy_button(screen, "back", back_button, font, fill_color=(240, 240, 240), glow_color=(180, 180, 180))

        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return "quit"
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if restart_button.collidepoint(event.pos):
                    return "restart"
                elif menu_button.collidepoint(event.pos):
                    return "menu"
                elif back_button.collidepoint(event.pos):
                    return "cancel"  # You can handle this as "do nothing and close options"
