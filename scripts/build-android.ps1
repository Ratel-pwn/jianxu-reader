$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to an installed JDK 17 before running this script.' }
if (-not $env:ANDROID_HOME -and $env:ANDROID_SDK_ROOT) { $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT }
if (-not $env:ANDROID_HOME) { throw 'Set ANDROID_HOME or ANDROID_SDK_ROOT to an installed Android SDK.' }
if (-not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { throw 'Set JAVA_HOME to an installed JDK 17.' }
if (-not (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platforms\android-36'))) { throw 'Android SDK 36 is required. This script does not install SDKs.' }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:NODE_ENV = 'development'
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.gradle'
$env:TEMP = Join-Path $projectRoot '.private\tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
if (-not (Test-Path -LiteralPath 'android\gradlew.bat')) { throw 'Run npx expo prebuild --platform android --no-install first.' }
$gradleArguments = @('-p', 'android', ':app:assembleDebug', '--no-daemon', '--max-workers=2', '-PreactNativeArchitectures=x86_64', '-Pandroid.builder.sdkDownload=false', '-Dorg.gradle.java.installations.auto-download=false')
& '.\android\gradlew.bat' @gradleArguments
if ($LASTEXITCODE -ne 0) { throw "Android build failed: $LASTEXITCODE" }
