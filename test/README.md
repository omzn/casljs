# casl2comet2js.htmlテスト

pytestとseleniumで`casl2comet2js.html`のrunコマンドをテストします．  
テストに使用する入力データとして`sample*.cas`および`input.json`を使用します．

`terminal_casl2comet2_test.py`がテストコードの本体です．  
このテストコードはActionsからも実行されます．

## テストのセットアップ

`terminal_casl2comet2_test.py`を実行するには以下のセットアップが必要です．

1. Firefox，Chrome，Python3をインストールする
2. 依存するモジュールをpipからインストールする
    ```bash
    # testディレクトリ内で実行
    pip install -r requirements.txt
    ```

## 開発者向け

ソースコードを変更した場合は以下のコマンドでフォーマットを適用してください．

```python
ruff check
ruff format
```

## テスト入力

CASL2ファイルとして`sample*.cas`を使用します．`samples`フォルダ内に入ってあります．

IN命令から入力される文字列は`input.json`ファイルに記述します．

## テスト実行

テストは`sample*.cas`の数だけ行われます．

pytestコマンドから実行できます．
```bash
# testディレクトリ内で実行
pytest -v
```

また，ブラウザを指定してテストを実行する際には，`-k`オプションを使用してブラウザを指定することもできます．
```bash
# testディレクトリ内で実行

# Firefoxでテストする場合
pytest -v -k Firefox

# Chromeでテストする場合
pytest -v -k Chrome
```

## テスト結果

テスト結果は，`sample*.cas`から期待される出力(COMET2ターミナルの出力)が行われたかどうかで判定されます．

`sampleN.cas`から期待される出力は`test_expect/sampleN.cas.out`に記載されてあります．

期待される出力と実際の出力が異なる場合，そのテストは失敗となります．

また，アセンブラエラーや実行のタイムアウト(3秒，sample16のみ60秒)が発生した場合も失敗扱いとなります．

# c2c2.js テスト

## 関連ファイル

* `input.json`: テスト対象に与える引数の定義です．
* `c2c2_input.py`: `input.json`から`c2c2.js`の実行に必要な引数を生成します．
* `samples/*/*.cas`: テスト対象です．
* `test_expects/*.out`: テスト対象に関連するオラクルです．

## テスト実行

testディレクトリ内で以下のコマンドを実行します．
```bash
./c2c2_test.sh
```
実行結果が期待と違う場合には，diffが生成されます．
