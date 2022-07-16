# install GeckoDriver
Invoke-WebRequest -Uri https://github.com/mozilla/geckodriver/releases/download/v0.31.0/geckodriver-v0.31.0-win64.zip -OutFile geckodriver.zip
Expand-Archive geckodriver.zip -DestinationPath .
Remove-Item geckodriver.zip

# install ChromeDriver
$chrome_fullversion = (Get-Item "C:\Program Files\Google\Chrome\Application\chrome.exe").VersionInfo.FileVersion
$chrome_majorversion = $chrome_fullversion.Split(".")[0]
$response = Invoke-WebRequest "http://chromedriver.storage.googleapis.com/LATEST_RELEASE_$chrome_majorversion"
$version = $response.Content
Invoke-WebRequest -Uri https://chromedriver.storage.googleapis.com/$version/chromedriver_win32.zip -OutFile chromedriver.zip
Expand-Archive chromedriver.zip -DestinationPath .
Remove-Item chromedriver.zip

#install python dependency
pip install -r requirements.txt