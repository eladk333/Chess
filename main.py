from game import run_game
from menu import show_menu

if __name__ == "__main__":
   while True:
        result = show_menu()
        if result is None:
            break

        mode, player_color = result
        if mode == "pvp":
            outcome = run_game(vs_ai=False)
        elif mode == "ai":
            outcome = run_game(vs_ai=True, player_color=player_color)
        else:
            continue  # unrecognized result

        if outcome == "menu":
            continue  # loop back to show_menu
        elif outcome == "quit":
            break
