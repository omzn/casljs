#!/usr/bin/env python3
import sys, json
data = json.load(sys.stdin)
try:
  print(' '.join([i for i in data[sys.argv[1]]]))
except:
  pass
