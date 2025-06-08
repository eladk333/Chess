from game import run_game
from menu import show_menu

if __name__ == "__main__":
    mode_info = show_menu()
    if mode_info:
        mode, color = mode_info
        if mode == "pvp":
            run_game(vs_ai=False)
        elif mode == "ai":
            run_game(vs_ai=True, player_color=color)