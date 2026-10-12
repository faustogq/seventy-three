#!/bin/bash
# Builds Seventy-Three.apk with the Android SDK tools directly (no Gradle, no downloads).
# Run build/assemble.py first: it puts the app's files in android/assets/www.
# The signing key (seventy-three.keystore) must be kept: updates must be signed with the same key.
set -euo pipefail
cd "$(dirname "$0")"

SDK=${ANDROID_SDK:-/opt/homebrew/share/android-commandlinetools}
BT=$SDK/build-tools/35.0.0
JAR=$SDK/platforms/android-35/android.jar
export JAVA_HOME=${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}
export PATH="$JAVA_HOME/bin:$PATH"
VERSION_CODE=$(date +%y%m%d%H)          # grows with every build, so the phone accepts it as an update
VERSION_NAME="1.0.$(date +%Y%m%d)"

[ -f assets/www/index.html ] || { echo "Run python3 build/assemble.py first"; exit 1; }

# signing key, created once and kept next to this script
if [ ! -f seventy-three.keystore ]; then
  PASS=$(openssl rand -hex 16)
  printf 'store=%s\n' "$PASS" > signing.properties
  chmod 600 signing.properties
  keytool -genkeypair -keystore seventy-three.keystore -alias seventythree -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" -dname "CN=Seventy-Three" >/dev/null 2>&1
fi
PASS=$(sed -n 's/^store=//p' signing.properties)

rm -rf out && mkdir -p out/classes out/dex out/gen
"$BT/aapt2" compile --dir res -o out/res.zip
"$BT/aapt2" link -o out/base.apk -I "$JAR" --manifest AndroidManifest.xml -A assets out/res.zip --java out/gen \
  --min-sdk-version 29 --target-sdk-version 34 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" --auto-add-overlay \
  $([ "${DEBUG:-0}" = 1 ] && echo --debug-mode)
javac --release 8 -nowarn -cp "$JAR" -d out/classes $(find src out/gen -name '*.java') 2>&1 | grep -v "^Note:" || true
[ -f out/classes/app/seventythree/bible/MainActivity.class ] || { echo "Java compile failed"; exit 1; }
"$BT/d8" --release --min-api 29 --lib "$JAR" --output out/dex $(find out/classes -name '*.class')
cp out/base.apk out/unsigned.apk
(cd out/dex && zip -q -j ../unsigned.apk classes.dex)
"$BT/zipalign" -f -p 4 out/unsigned.apk out/aligned.apk
"$BT/apksigner" sign --ks seventy-three.keystore --ks-key-alias seventythree --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --out Seventy-Three.apk out/aligned.apk
"$BT/apksigner" verify Seventy-Three.apk
rm -rf out
echo "Seventy-Three.apk $(du -h Seventy-Three.apk | cut -f1) · version $VERSION_NAME ($VERSION_CODE)"
