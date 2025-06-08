import pygame
from ui.layout import BoardArea

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
DARK_BG = (50, 50, 50)

def draw_button(screen, text, rect, font):
    pygame.draw.rect(screen, WHITE, rect)
    pygame.draw.rect(screen, BLACK, rect, 3)
    label = font.render(text, True, BLACK)
    label_rect = label.get_rect(center=rect.center)
    screen.blit(label, label_rect)

def show_options(screen, layout: BoardArea):
    overlay = pygame.Surface((layout.screen_width, layout.screen_height), pygame.SRCALPHA)
    overlay.fill((0, 0, 0, 180))  # Semi-transparent black
    font = pygame.font.SysFont(None, 48)

    restart_button = pygame.Rect(layout.screen_width // 2 - 150, layout.top + 100, 300, 70)
    menu_button = pygame.Rect(layout.screen_width // 2 - 150, layout.top + 200, 300, 70)

    while True:
        screen.blit(overlay, (0, 0))
        draw_button(screen, "Restart Game", restart_button, font)
        draw_button(screen, "Back to Menu", menu_button, font)
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
