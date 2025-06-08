def parse_pos(pos):
    col = ord(pos[0]) - ord('a')
    row = 8 - int(pos[1])
    return row, col
