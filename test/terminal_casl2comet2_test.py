import glob
import itertools
import json
import os
import re
from pathlib import Path
from typing import Any, Generator

import pytest
from pytest import FixtureRequest
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver import ActionChains, ChromeOptions, FirefoxOptions, Keys
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager


class Casl2AssembleError(Exception):
    pass


def init_firefox_driver() -> WebDriver:
    options = FirefoxOptions()
    options.add_argument("-headless")
    options.set_preference("accessibility.typeaheadfind.manual", False)
    driver = webdriver.Firefox(
        service=FirefoxService(GeckoDriverManager().install()),
        options=options,
    )
    return driver


def init_chrome_driver() -> WebDriver:
    options = ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--allow-running-insecure-content")
    options.add_argument("--disable-web-security")
    options.add_argument("--disable-desktop-notifications")
    options.add_argument("--disable-extensions")
    options.add_experimental_option("excludeSwitches", ["enable-logging"])
    driver = webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=options,
    )
    return driver


def common_task(
    driver: WebDriver, casl2_file: str, out_file: Path, timeout: int
) -> None:
    driver.refresh()
    with open(casl2_file, encoding="utf-8") as fp:
        buf = fp.read()
    try:
        e = driver.find_element(By.ID, "casl2src")
        e.clear()
        buf_to_js = buf.replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')
        driver.execute_script(
            f'document.getElementById("casl2src").value="{buf_to_js}"'
        )
        # e.send_keys(buf)
        e = driver.find_element(By.ID, "assemble")
        e.click()
        e = driver.find_element(By.ID, "terminal_casl2")
        if "DEFINED SYMBOLS" not in e.text:
            raise Casl2AssembleError
        e = driver.find_element(By.ID, "terminal_comet2")
        ActionChains(driver).move_to_element(e).click().send_keys("run").send_keys(
            Keys.RETURN
        ).perform()
        with open("input.json") as fp:
            input = json.load(fp)
        if Path(casl2_file).name in input.keys():
            for in_str in input[Path(casl2_file).name]:
                ActionChains(driver).move_to_element(e).click().send_keys(
                    in_str
                ).send_keys(Keys.RETURN).perform()
        WebDriverWait(driver, timeout).until(
            expected_conditions.text_to_be_present_in_element(
                (By.ID, "terminal_comet2"), "Program finished"
            )
        )
        terminal_text = e.text
        with open(out_file, mode="w") as fp:
            out_match = re.search(
                r"^comet2> run\n(.*)Program finished",
                terminal_text,
                flags=re.MULTILINE | re.DOTALL,
            )
            if out_match:
                o_raw = out_match.group(1).splitlines(True)
                for line in o_raw:
                    if re.match(r"(IN|OUT)>", line):
                        fp.write(line)
                # fp.write(out_match.group(1))
    except TimeoutException:
        terminal_text = e.text
        with open(out_file, mode="w") as fp:
            fp.write("============TIMEOUT==============\n")
            out_match = re.search(
                r"^run\n(.*)", terminal_text, flags=re.MULTILINE | re.DOTALL
            )
            if out_match:
                fp.write(out_match.group(1))
        raise TimeoutException(f"Timeout ({timeout}sec)")
    except Casl2AssembleError:
        with open(out_file, mode="w") as fp:
            fp.write("============ASSEMBLE ERROR==============\n")
            fp.write(e.text)
        raise Casl2AssembleError
    except Exception as err:
        with open(out_file, mode="w") as fp:
            print(err, file=fp)
        raise err


# ===================================
# pytest code
# ===================================

TEST_RESULT_DIR = "test_results"
TEST_EXPECT_DIR = "test_expects"

browsers = ["Firefox", "Chrome"]
sample_files = sorted(glob.glob("samples/**/*.cas", recursive=True))
test_data = list(itertools.product(browsers, sample_files))


@pytest.fixture(scope="module")
def Firefox() -> Generator[WebDriver, Any, None]:
    driver = init_firefox_driver()
    yield driver
    driver.quit()


@pytest.fixture(scope="module")
def Chrome() -> Generator[WebDriver, Any, None]:
    driver = init_chrome_driver()
    yield driver
    driver.quit()


@pytest.mark.parametrize(("driver_name,casl2_file"), test_data)
def test_casl2comet2_run(
    driver_name: str, casl2_file: str, request: FixtureRequest
) -> None:
    driver = request.getfixturevalue(driver_name)
    path_to_html = Path(__file__).parent.parent.joinpath("index.html")
    driver.get("file://" + str(path_to_html))
    driver.set_window_size(1920, 800)
    if not Path(TEST_RESULT_DIR).exists():
        os.mkdir(TEST_RESULT_DIR)
    out_file = Path(TEST_RESULT_DIR).joinpath(Path(casl2_file).name + ".out")
    if Path(casl2_file).name == "sample16.cas":
        timeout = 90
    else:
        timeout = 10
    common_task(driver, casl2_file, out_file, timeout)
    expect_file = Path(TEST_EXPECT_DIR).joinpath(Path(casl2_file).name + ".out")
    with open(out_file) as ofp, open(expect_file) as efp:
        assert ofp.read() == efp.read()
