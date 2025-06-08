import torch
from torch import nn, optim
from ml.network import ChessNet
from ml.self_play import simulate_game
import random
from game_setup import create_starting_board

def random_policy(moves, state_tensor):
    return random.choice(moves)

def train_model():
    model = ChessNet()
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()

    best_loss = float("inf")

    for epoch in range(500):
        states, rewards = simulate_game(random_policy, create_starting_board)
        if not states:
            continue

        states_tensor = torch.stack(states)
        rewards_tensor = torch.tensor(rewards, dtype=torch.float32).unsqueeze(1)

        outputs = model(states_tensor)
        loss = loss_fn(outputs, rewards_tensor)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        print(f"Epoch {epoch+1}, Loss: {loss.item():.4f}")

        # Save best model so far
        if loss.item() < best_loss:
            best_loss = loss.item()
            torch.save(model.state_dict(), "chess_model_best.pt")
            print(f"Saved new best model (Loss: {best_loss:.4f})")

    # Always save the final model too
    torch.save(model.state_dict(), "chess_model.pt")


if __name__ == "__main__":
    train_model()
