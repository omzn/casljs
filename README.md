# CASL2 アセンブラ/ COMET2 エミュレータ for KIT 言語処理プログラミング

CASL2, COMET2 の JavaScript 実装です．
オリジナルの perl 版は https://github.com/omzn/casl2

## 開発中

方針: 1 枚もののオフライン Web ページで実行可能にする．
* casl2comet2.html に必要なものがすべて書いてあるようにしたい．

### casl2comet2.html

* 開く Web ページ

* TODO:
  * Assemble したソースコードを Cookie に保存して，リロードしても消えないようにする．

### terminal_casl2comet2.js

* 状況: 90%
  * terminal.js を利用して，Web ページ上の簡易ターミナルで動かすようにした． そのため，インタラクティブインターフェイスがそのまま利用できる．
  * exec_in の実装完了．メインループの input を IN 命令の input に流用することで，callback 問題を解決した．
  * cmd_run はステップ数を指定して実行する cmd_step の特殊ケースに実装を変更した．

### 独自拡張

* ラベルにはスコープがあります．スコープはプログラム内(START 命令から END 命令で囲まれた部分)のみです．
* CALL 命令にもスコープが効きますが，CALL だけは別プログラムの開始ラベル(START 命令のラベル)まで参照できます．
* 簡単のため，MULA (算術乗算), MULL (論理乗算), DIVA (算術除算), DIVL (論理除算)を実装しています．利用方法は ADDA, ADDL 等とほぼ同じです．
  * DIVA, DIVL については，0 除算を行おうとすると ZF と OF が同時に立って，計算は行われずに先に進みます．
* comet2 に clear コマンドを追加．ターミナルをクリアする．

### License

* terminaljs

The MIT License (MIT)

Copyright (c) 2014 Erik Österberg

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

* casl2/comet2

CASL assembler / COMET emulator
Copyright (C) 1998-2000 Hiroyuki Ohsaki (oosaki@ist.osaka-u.ac.jp)
CASL II assembler / COMET II emulator
Copyright (C) 2001-2022 Osamu Mizuno (o-mizuno@kit.ac.jp)

This program is free software; you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the
Free Software Foundation; either version 2 of the License, or (at your
option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
675 Mass Ave, Cambridge, MA 02139, USA.
