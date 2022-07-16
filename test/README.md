# casl2comet2js.htmlテスト

pytestとseleniumで`casl2comet2js.html`のrunコマンドをテストします．  
テストに使用する入力データとして`sample*.cas`を使用します．

## テストのセットアップ

Firefox，Chrome，Python3をインストールし，`setup_test.sh`または`setup_test.ps1`を実行してください

```bash
# bashの場合
cd test
./setup_test.sh
```

```powershell
# Windows powershellの場合
cd test
./setup_test.ps1
```

## テスト入力

CASL2ファイルとして`sample*.cas`を使用します．

IN命令から入力される文字列は`input.json`ファイルに記述します．

## テスト実行

テストは`sample*.cas`の数だけ行われます．

pytestコマンドから実行できます．
```bash
# testディレクトリ内で実行
pytest
```

また，pythonからも簡易的なテストを実行することができます．
```bash
# testディレクトリ内で実行

# Firefoxでテストする場合
python ./terminal_casl2comet2_test.py firefox

# Chromeでテストする場合
python ./terminal_casl2comet2_test.py chrome
```

## テスト結果

テスト結果は，`sample*.cas`から期待される出力(OUT)が行われたかどうかで判定されます．

アセンブラエラーや実行のタイムアウト(3秒，sample16のみ60秒)が発生した場合は失敗扱いとなります．

Github Actionsの欄からもテスト結果を見ることができます．