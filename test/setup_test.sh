#!/usr/bin/env bash

# install GeckoDriver and ChromeDriver
if [ "$(uname)" == 'Darwin' ]; then
    CHROME_VERSION=$("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version | cut -f 3 -d ' ' | cut -d '.' -f 1)
    VERSION=$(curl --location --fail --retry 10 http://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION})
    if [[ $(uname -m) == 'arm64' ]]; then
        wget https://github.com/mozilla/geckodriver/releases/download/v0.31.0/geckodriver-v0.31.0-macos-aarch64.tar.gz -O geckodriver.tar.gz
        wget https://chromedriver.storage.googleapis.com/${VERSION}/chromedriver_mac64_m1.zip -O chromedriver.zip
    else
        wget https://github.com/mozilla/geckodriver/releases/download/v0.31.0/geckodriver-v0.31.0-macos.tar.gz -O geckodriver.tar.gz
        wget https://chromedriver.storage.googleapis.com/${VERSION}/chromedriver_mac64.zip -O chromedriver.zip
    fi
elif [ "$(expr substr $(uname -s) 1 5)" == 'Linux' ]; then
    CHROME_VERSION=$("google-chrome" --version | cut -f 3 -d ' ' | cut -d '.' -f 1)
    VERSION=$(curl --location --fail --retry 10 http://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION})
    wget https://github.com/mozilla/geckodriver/releases/download/v0.31.0/geckodriver-v0.31.0-linux64.tar.gz -O geckodriver.tar.gz
    wget https://chromedriver.storage.googleapis.com/${VERSION}/chromedriver_linux64.zip -O chromedriver.zip
else
    echo "Your platform ($(uname -a)) is not supported."
    exit 1
fi
tar -zxvf geckodriver.tar.gz
unzip chromedriver.zip
rm geckodriver.tar.gz
rm chromedriver.zip

#install python dependency
pip install -r requirements.txt