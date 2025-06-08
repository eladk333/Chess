import pygame
from ui.layout import BoardArea  

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GREEN = (0, 128, 0)

def draw_button(screen, text, rect, font):
    pygame.draw.rect(screen, WHITE, rect)
    pygame.draw.rect(screen, BLACK, rect, 3)
    label = font.render(text, True, BLACK)
    label_rect = label.get_rect(center=rect.center)
    screen.blit(label, label_rect)

def show_menu():
    pygame.init()

    layout = BoardArea(top=60) 
    screen = pygame.display.set_mode((layout.screen_width, layout.screen_height))
    pygame.display.set_caption("Chess Menu")
    font = pygame.font.SysFont(None, 48)

    
    button_width, button_height = 300, 80
    pvp_button = pygame.Rect(
        (layout.screen_width - button_width) // 2,
        layout.top + 140,
        button_width,
        button_height
    )
    ai_button = pygame.Rect(
        (layout.screen_width - button_width) // 2,
        layout.top + 280,
        button_width,
        button_height
    )

    while True:
        screen.fill(GREEN)
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

    while True:
        screen.fill((50, 50, 80))
        label = font.render("Choose Your Side", True, (255, 255, 255))
        label_rect = label.get_rect(center=(layout.screen_width // 2, layout.top + 140))
        screen.blit(label, label_rect)

        draw_button(screen, "White", white_button, font)
        draw_button(screen, "Black", black_button, font)
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
