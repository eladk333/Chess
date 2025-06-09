# How it works pretty much

## To train the model  
```bash
python3 -m ml.trainer
```
This will create `chess_model_best.pt` which contains the trained neural network. Pretty much the network just take a board position and returns a score that estimate how good the position is for the current player.

## To avaluate how good the model is
```bash
python3 -m ml.evaluate_model
```
It plays vs a random move player and returns how many wins draws and accuarcy of the model.

## Just to play the game run 
```bash
python3 main.py 
```
