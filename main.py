from game import run_game
from menu import show_menu

if __name__ == "__main__":
   while True:
        result = show_menu()
        if result is None:
            break

        mode, setup_data = result
        
        if mode == "pvp":
            outcome = run_game(mode="pvp")
        elif mode == "pve":
            outcome = run_game(mode="pve", player_color=setup_data)
        elif mode == "eve":
            outcome = run_game(mode="eve", ai_setup=setup_data)
        else:
            continue

        if outcome == "menu":
            continue
        elif outcome == "quit":
            break