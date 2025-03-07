import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Generator

import pytest


class Casl2AssembleError(Exception):
    pass


def command(cmd) -> Generator[str, Any, None]:
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
        )
        for line in result.stdout.splitlines():
            yield line
    except subprocess.CalledProcessError:
        print(f"外部プログラムの実行に失敗しました [{cmd}]", file=sys.stderr)
        sys.exit(1)


def common_task(casl2_file: Path, out_file: Path) -> None:
    try:
        c2c2 = Path(__file__).parent.parent / "c2c2.js"
        assembler_text = command(f"node {c2c2} -n -c -a {casl2_file}")
        if "DEFINED SYMBOLS" not in assembler_text:
            raise Casl2AssembleError
        with open("input.json") as fp:
            input = json.load(fp)
        inputparams = ""
        if casl2_file.name in input.keys():
            inputparams = " ".join([i for i in input[Path(casl2_file).name]])
        terminal_text = command(f"node {c2c2} -n -q -r {casl2_file} {inputparams}")
        with open(out_file, mode="w") as fp:
            for line in terminal_text:
                fp.write(line + "\n")
    except Casl2AssembleError:
        with open(out_file, mode="w") as fp:
            fp.write("============ASSEMBLE ERROR==============\n")
            for line in assembler_text:
                fp.write(line + "\n")
        raise Casl2AssembleError
    except Exception as err:
        with open(out_file, mode="w") as fp:
            print(err, file=fp)
        raise err


# ===================================
# pytest code
# ===================================

TEST_RESULT_DIR = Path("test_results")
TEST_EXPECT_DIR = Path("test_expects")

TEST_RESULT_DIR.mkdir(exist_ok=True)
# parametrizeでサンプルファイル名を表示するにはstr型に変換する必要がある
sample_files: list[str] = sorted(
    [str(path) for path in Path("samples").glob("**/*.cas")]
)
test_data = sample_files


@pytest.mark.timeout(90)
@pytest.mark.parametrize(("casl2_file_path"), test_data)
def test_c2c2_run(casl2_file_path: str) -> None:
    casl2_file = Path(casl2_file_path)
    out_file = TEST_RESULT_DIR / (casl2_file.name + ".out")
    common_task(casl2_file, out_file)
    expect_file = TEST_EXPECT_DIR / (casl2_file.name + ".out")
    with open(out_file) as ofp, open(expect_file) as efp:
        assert ofp.read() == efp.read()
