import sys
sys.stdout.reconfigure(encoding='utf-8')
fname = 'src/routes/producto.$id.tsx'
with open(fname, 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, l in enumerate(lines, 1):
    if any(x in l for x in ['precio', 'Price', 'price', 'OFF', 'Transfer', 'money', 'descuento', 'Descuento']):
        print(f'{i}: {l}', end='')
