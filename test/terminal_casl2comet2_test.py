import sys
import os
import glob
import re
import json
import pytest
from selenium import webdriver
from selenium.webdriver import FirefoxOptions
from selenium.webdriver import ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver import Keys, ActionChains
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.common.exceptions import TimeoutException


class Casl2AssembleError(Exception):
    pass


def init_firefox_driver():
    options = FirefoxOptions()
    options.add_argument("--headless")
    if os.name == "nt" and os.path.exists("geckodriver.exe"):
        driver = webdriver.Firefox(service=FirefoxService(executable_path="geckodriver.exe"), options=options)
    elif os.name == "posix" and os.path.exists("geckodriver"):
        driver = webdriver.Firefox(service=FirefoxService(executable_path="geckodriver"), options=options)
    else:
        driver = webdriver.Firefox(options=options)
    path_to_html = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "casl2comet2js.html").replace(os.path.sep, "/")
    driver.get("file://" + path_to_html)
    driver.set_window_size(1440, 900)
    return driver


def init_chrome_driver():
    options = ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--allow-running-insecure-content')
    options.add_argument('--disable-web-security')
    options.add_argument('--disable-desktop-notifications')
    options.add_argument("--disable-extensions")
    options.add_experimental_option('excludeSwitches', ['enable-logging'])
    if os.name == "nt" and os.path.exists("chromedriver.exe"):
        driver = webdriver.Chrome(service=ChromeService(executable_path="chromedriver.exe"), options=options)
    elif os.name == "posix" and os.path.exists("chromedriver"):
        driver = webdriver.Chrome(service=ChromeService(executable_path="chromedriver"), options=options)
    else:
        driver = webdriver.Chrome(options=options)
    path_to_html = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "casl2comet2js.html").replace(os.path.sep, "/")
    driver.get("file://" + path_to_html)
    driver.set_window_size(1440, 900)
    return driver

def common_task(driver, casl2_file, out_file, timeout):
    driver.refresh()
    with open(casl2_file, encoding="utf-8") as fp:
        buf = fp.read()
    try:
        e = driver.find_element(By.ID, "casl2src")
        e.clear()
        buf_to_js = buf.replace('\\', '\\\\').replace('\n', '\\n').replace('\"', '\\"')
        driver.execute_script(f'document.getElementById("casl2src").value="%s"' % buf_to_js)
        # e.send_keys(buf)
        e = driver.find_element(By.ID, "assemble")
        e.click()
        e = driver.find_element(By.ID, "terminal-2")
        if not "DEFINED SYMBOLS" in e.text:
            raise Casl2AssembleError
        e = driver.find_element(By.ID, "terminal-1")
        ActionChains(driver)\
            .move_to_element(e)\
            .click()\
            .send_keys("run")\
            .send_keys(Keys.RETURN)\
            .perform()
        with open("input.json") as fp:
            input = json.load(fp)
        if os.path.basename(casl2_file) in input.keys():
            for in_str in input[os.path.basename(casl2_file)]:
                ActionChains(driver)\
                    .move_to_element(e)\
                    .click()\
                    .send_keys(in_str)\
                    .send_keys(Keys.RETURN)\
                    .perform()
        WebDriverWait(driver, timeout).until(expected_conditions.text_to_be_present_in_element((By.ID, "terminal-1"), "[Program finished]"))
        terminal_text = e.text
        with open(out_file, mode='w') as fp:
            out_match = re.search(r"^run\n(.*)\[Program finished\]", terminal_text, flags=re.MULTILINE | re.DOTALL)
            if out_match:
                fp.write(out_match.group(1))
    except TimeoutException:
        terminal_text = e.text
        with open(out_file, mode='w') as fp:
            fp.write("============TIMEOUT==============\n")
            out_match = re.search(r"^run\n(.*)", terminal_text, flags=re.MULTILINE | re.DOTALL)
            if out_match:
                fp.write(out_match.group(1))
        raise TimeoutException(f"Timeout ({timeout}sec)")
    except Casl2AssembleError:
        with open(out_file, mode='w') as fp:
            fp.write("============ASSEMBLE ERROR==============\n")
            fp.write(e.text)
        raise Casl2AssembleError
    except Exception as err:
        with open(out_file, mode='w') as fp:
            print(err, file=fp)
        raise err


if __name__ == "__main__":
    sample_files = glob.glob("samples/**/*.cas", recursive=True)
    if len(sys.argv) != 2:
        print("Please specify the browser to use in the argument.(firefox|chrome)")
        sys.exit(-1)
    if sys.argv[1] == "firefox":
        driver = init_firefox_driver()
    elif sys.argv[1] == "chrome":
        driver = init_chrome_driver()
    else:
        print("You can only specify firefox or chrome for your browser.")
        sys.exit(-1)
    passed = 0
    failed = 0
    if not os.path.exists("test_result"):
        os.mkdir("test_result")
    try:
        for src in sample_files:
            print(os.path.basename(src) + ": ", end="")
            sys.stdout.flush()
            if (os.path.basename(src) == "sample16.cas"):
                timeout = 60
            else:
                timeout = 3
            try:
                out_file = os.path.join("test_result", os.path.basename(src) + ".out")
                expect_file = os.path.join("test_expect", os.path.basename(src) + ".out")
                common_task(driver, src, out_file, timeout)
                with open(out_file) as ofp, open(expect_file) as efp:
                    assert ofp.read() == efp.read()
            except AssertionError:
                failed += 1
                print("\033[31mFAILED\033[0m")
            except Casl2AssembleError:
                failed += 1
                print("\033[34mASMERROR\033[0m")
            except TimeoutException:
                failed += 1
                print("\033[33mTIMEOUT\033[0m")
            except KeyboardInterrupt:
                raise KeyboardInterrupt
            except Exception:
                failed += 1
                print("\033[31mERROR\033[0m")
            else:
                passed += 1
                print("\033[32mPASSED\033[0m")
    except KeyboardInterrupt:
        print("\033[33m==================Exit from Test with Ctrl+C!=================\033[0m")
    finally:
        driver.quit()
        print(f"passed:{passed}, failed:{failed}")
        sys.exit(0)


# ===================================
# pytest code
# ===================================


test_data = [
    ('Firefox', 'samples/program1/sample11.cas'),
    ('Firefox', 'samples/program1/sample11p.cas'),
    ('Firefox', 'samples/program1/sample11pp.cas'),
    ('Firefox', 'samples/program1/sample12.cas'),
    ('Firefox', 'samples/program1/sample13.cas'),
    ('Firefox', 'samples/program1/sample14.cas'),
    ('Firefox', 'samples/program1/sample14p.cas'),
    ('Firefox', 'samples/program1/sample15.cas'),
    ('Firefox', 'samples/program1/sample15a.cas'),
    ('Firefox', 'samples/program1/sample16.cas'),
    ('Firefox', 'samples/program1/sample17.cas'),
    ('Firefox', 'samples/program1/sample18.cas'),
    ('Firefox', 'samples/program1/sample19p.cas'),
    ('Firefox', 'samples/program2/sample21.cas'),
    ('Firefox', 'samples/program2/sample22.cas'),
    ('Firefox', 'samples/program2/sample23.cas'),
    ('Firefox', 'samples/program2/sample24.cas'),
    ('Firefox', 'samples/program2/sample25.cas'),
    ('Firefox', 'samples/program2/sample25t.cas'),
    ('Firefox', 'samples/program2/sample26.cas'),
    ('Firefox', 'samples/program2/sample27.cas'),
    ('Firefox', 'samples/program2/sample28p.cas'),
    ('Firefox', 'samples/program2/sample29p.cas'),
    ('Firefox', 'samples/program2/sample2a.cas'),
    ('Firefox', 'samples/program3/sample31p.cas'),
    ('Firefox', 'samples/program3/sample33p.cas'),
    ('Firefox', 'samples/program3/sample34.cas'),
    ('Firefox', 'samples/program3/sample35.cas'),
    ('Chrome', 'samples/program1/sample11.cas'),
    ('Chrome', 'samples/program1/sample11p.cas'),
    ('Chrome', 'samples/program1/sample11pp.cas'),
    ('Chrome', 'samples/program1/sample12.cas'),
    ('Chrome', 'samples/program1/sample13.cas'),
    ('Chrome', 'samples/program1/sample14.cas'),
    ('Chrome', 'samples/program1/sample14p.cas'),
    ('Chrome', 'samples/program1/sample15.cas'),
    ('Chrome', 'samples/program1/sample15a.cas'),
    ('Chrome', 'samples/program1/sample16.cas'),
    ('Chrome', 'samples/program1/sample17.cas'),
    ('Chrome', 'samples/program1/sample18.cas'),
    ('Chrome', 'samples/program1/sample19p.cas'),
    ('Chrome', 'samples/program2/sample21.cas'),
    ('Chrome', 'samples/program2/sample22.cas'),
    ('Chrome', 'samples/program2/sample23.cas'),
    ('Chrome', 'samples/program2/sample24.cas'),
    ('Chrome', 'samples/program2/sample25.cas'),
    ('Chrome', 'samples/program2/sample25t.cas'),
    ('Chrome', 'samples/program2/sample26.cas'),
    ('Chrome', 'samples/program2/sample27.cas'),
    ('Chrome', 'samples/program2/sample28p.cas'),
    ('Chrome', 'samples/program2/sample29p.cas'),
    ('Chrome', 'samples/program2/sample2a.cas'),
    ('Chrome', 'samples/program3/sample31p.cas'),
    ('Chrome', 'samples/program3/sample33p.cas'),
    ('Chrome', 'samples/program3/sample34.cas'),
    ('Chrome', 'samples/program3/sample35.cas')
]


@pytest.fixture
def Firefox():
    driver = init_firefox_driver()
    yield driver
    driver.quit()


@pytest.fixture
def Chrome():
    driver = init_chrome_driver()
    yield driver
    driver.quit()


@pytest.mark.parametrize(("driver,casl2_file"), test_data)
def test_casl2comet2_run(driver, casl2_file, request):
    if not os.path.exists("test_result"):
        os.mkdir("test_result")
    out_file = os.path.join("test_result", os.path.basename(casl2_file) + ".out")
    if (os.path.basename(casl2_file) == "sample16.cas"):
        timeout = 60
    else:
        timeout = 3
    common_task(request.getfixturevalue(driver), casl2_file, out_file, timeout)
    expect_file = os.path.join("test_expect", os.path.basename(casl2_file) + ".out")
    with open(out_file) as ofp, open(expect_file) as efp:
        assert ofp.read() == efp.read()
