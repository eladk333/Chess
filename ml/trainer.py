import torch
from torch import nn, optim
from ml.network import ChessNet
from ml.self_play import simulate_game
from game_setup import create_starting_board

def train_model():
    model = ChessNet()
    optimizer = optim.Adam(model.parameters(), lr=1e-4)

    value_loss_fn = nn.MSELoss()
    policy_loss_fn = nn.CrossEntropyLoss()

    best_loss = float("inf")

    for epoch in range(500):
        model.train()

        all_states, all_policies, all_rewards = [], [], []

        for _ in range(10):  
            states, policies, rewards = simulate_game(model, create_starting_board)
            all_states.extend(states)
            all_policies.extend(policies)
            all_rewards.extend(rewards)

        if not all_states:
            continue

        states_tensor = torch.stack(all_states)
        policy_tensor = torch.stack(all_policies)
        rewards_tensor = torch.stack(all_rewards)

        # Forward pass
        policy_logits, value_preds = model(states_tensor)  # (B, 4096), (B, 1)

        # Value loss
        value_loss = value_loss_fn(value_preds, rewards_tensor)

        # Policy loss
        move_indices = policy_tensor.argmax(dim=1)  # convert one-hot to index
        policy_loss = policy_loss_fn(policy_logits, move_indices)

        # Total loss
        loss = value_loss + policy_loss

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        if (epoch + 1) % 20 == 0:
            print(f"Epoch {epoch+1}, Total Loss: {loss.item():.4f}, Value Loss: {value_loss.item():.4f}, Policy Loss: {policy_loss.item():.4f}")
        if loss.item() < best_loss:
            best_loss = loss.item()
            torch.save(model.state_dict(), "chess_model_best.pt")
            print(f"Saved new best model (Loss: {best_loss:.4f})")

    torch.save(model.state_dict(), "chess_model.pt")
    print(f"Best loss: {best_loss:.4f}")



if __name__ == "__main__":
    train_model()

