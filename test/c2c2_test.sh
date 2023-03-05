#!/bin/sh
C2C2='node ../c2c2.js -r -n -q'
for f in samples/*/*.cas; do
  filename=`basename $f`
  PARAMS=`cat input.json | ./c2c2_input.py $filename`
  echo $C2C2 $f $PARAMS
  $C2C2 $f $PARAMS | diff test_expects/$filename.out -
done
#node c2c2 -r -q test/samples/program1/sample11.cas `cat test/input.json| python3 -c "import sys, json; data=json.load(sys.stdin); print(' '.join([i for i in data['sample11.cas']]))"`
#node c2c2 -r -q $f `cat test/input.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(' '.join(["i" for i in data['$filename']]))"`
