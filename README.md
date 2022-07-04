# CASL2 アセンブラ/ COMET2 エミュレータ for KIT 言語処理プログラミング

CASL2, COMET2のJavaScript実装です．
オリジナルのperl版は https://github.com/omzn/casl2 

## 開発中

方針: 1枚もののオフラインWebページで実行可能にする．
* casl2comet2.html に必要なものがすべて書いてあるようにしたい．

### casl2comet2.html

* 開くWebページ

* TODO:
  * AssembleしたソースコードをCookieに保存して，リロードしても消えないようにする．

### terminal_casl2comet2.js

* 状況: 90%
  * terminal.jsを利用して，Webページ上の簡易ターミナルで動かすようにした． そのため，インタラクティブインターフェイスがそのまま利用できる．
  * exec_inの実装完了．メインループのinputをIN命令のinputに流用することで，callback問題を解決した．
  * cmd_run はステップ数を指定して実行するcmd_stepの特殊ケースに実装を変更した．

* TODO:
  * `exec_out`を実装する．

### 独自拡張

* ラベルにはスコープがあります．スコープはプログラム内(START命令からEND命令で囲まれた部分)のみです．
* CALL命令にもスコープが効きますが，CALLだけは別プログラムの開始ラベル(START命令のラベル)まで参照することができます．
* 簡単のため，MULA (算術乗算), MULL (論理乗算), DIVA (算術除算), DIVL (論理除算)を実装しています．利用方法はADDA, ADDL等とほぼ同じです．
  * DIVA, DIVLについては，0除算を行おうとするとZFとOFが同時に立って，計算は行われずに先に進みます．
* comet2にclearコマンドを追加．ターミナルをクリアする．

### License

* terminaljs

The MIT License (MIT)

Copyright (c) 2014 Erik Österberg

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.