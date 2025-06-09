## How our AI works at run time

1. **MinimaxAI** generates every legal move for the current board state.
2. For each move generated, it:
- Simulates the ove on a copy of the baord.
- Recursively 
3. Once we reach the deepest level (set by how much depth we chose) it calls our neural network the evaluate the resulting position.

## How training our neural network works

Our neural network takes a board state as the input and gives an output a scalar in the range `[-1, 1]`
when `+1` means strongly winning for white `-1` mean strongly winning for black and `0` means the position is equal or uncertain.


