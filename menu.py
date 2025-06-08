import pygame

SCREEN_WIDTH = 640
SCREEN_HEIGHT = 640
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
    screen = pygame.display.set_mode((640, 640))
    pygame.display.set_caption("Chess Menu")
    font = pygame.font.SysFont(None, 48)

    pvp_button = pygame.Rect(170, 200, 300, 80)
    ai_button = pygame.Rect(170, 350, 300, 80)

    while True:
        screen.fill((0, 128, 0))
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
                    return show_color_selection(screen, font)

def show_color_selection(screen, font):
    white_button = pygame.Rect(120, 300, 150, 80)
    black_button = pygame.Rect(370, 300, 150, 80)

    while True:
        screen.fill((50, 50, 80))
        label = font.render("Choose Your Side", True, (255, 255, 255))
        screen.blit(label, (180, 180))
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
