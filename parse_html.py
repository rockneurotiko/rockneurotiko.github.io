#!/usr/bin/python
index = None
with open('index.html', 'r') as f:
    index = ''.join(f.readlines())

index = index.replace('/home/rock/Git/rockneurotiko.github.io/', '')
index = index.replace('<title>index</title>', '<title>Open Web Contents by Rock Neurotiko</title>')

with open('index.html','w') as f:
    f.write(index)
