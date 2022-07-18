# casl2comet2js.htmlテスト

pytestとseleniumで`casl2comet2js.html`のrunコマンドをテストします．  
テストに使用する入力データとして`sample*.cas`および`input.json`を使用します．

`terminal_casl2comet2_test.py`がテストコードの本体です．  
このテストコードはActionsからも実行されます．

## テストのセットアップ

`terminal_casl2comet2_test.py`を実行するには以下のセットアップが必要です．

1. Firefox，Chrome，Python3をインストールする
2. `setup_test.sh`または`setup_test.ps1`を実行する
    ```bash
    # Linux, MacOSの場合
    cd test
    ./setup_test.sh
    ```

    ```powershell
    # Windowsの場合
    cd test
    ./setup_test.ps1
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