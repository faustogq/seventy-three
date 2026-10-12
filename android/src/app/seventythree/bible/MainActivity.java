package app.seventythree.bible;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Seventy-Three for Android: the web app runs in a WebView and every file comes from the APK's assets
 * (assets/www), served under a private https address so storage and fetch behave as on the web.
 * Nothing is downloaded: the Bible, the data and all the commentary are inside the app.
 * The page reaches the phone through window.S73Native: saving files, copying, and reading aloud.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/index.html";
    static final int FILE_REQUEST = 73;

    WebView web;
    ValueCallback<Uri[]> fileCallback;
    TextToSpeech tts;
    volatile boolean ttsReady = false;
    volatile String lastUtterance = null;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        // test builds (build-apk.sh with DEBUG=1) can be inspected from a computer; normal builds cannot
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        setContentView(web);
        paintSystemBars();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(), "S73Native");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!HOST.equals(url.getHost())) return null;
                return asset(url.getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (HOST.equals(url.getHost())) return false;
                // sources, Wikipedia and other outside links open in the phone's browser
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_REQUEST);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status != TextToSpeech.SUCCESS) return;
                int r = tts.setLanguage(Locale.US);
                ttsReady = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
                tts.setSpeechRate(0.95f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { finished(id); }
                    @Override public void onError(String id) { finished(id); }
                    @Override public void onStop(String id, boolean interrupted) { }
                });
            }
        });

        web.loadUrl(START);
    }

    /** One file from assets/www; anything missing answers 404 so nothing ever goes to the network. */
    WebResourceResponse asset(String path) {
        if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
        String name = path.startsWith("/") ? path.substring(1) : path;
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache");
        if (name.equals("favicon.ico")) {
            return new WebResourceResponse("image/x-icon", null, 204, "No Content", headers, new ByteArrayInputStream(new byte[0]));
        }
        if (name.contains("..")) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, new ByteArrayInputStream(new byte[0]));
        }
        try {
            InputStream in = getAssets().open("www/" + name);
            String mime = mimeOf(name);
            String enc = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("javascript") ? "utf-8" : null;
            return new WebResourceResponse(mime, enc, 200, "OK", headers, in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, new ByteArrayInputStream(new byte[0]));
        }
    }

    static String mimeOf(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".html")) return "text/html";
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".js")) return "text/javascript";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".woff2")) return "font/woff2";
        if (n.endsWith(".txt")) return "text/plain";
        if (n.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    /** Status and navigation bars in the app's own colours, light or dark like the phone. */
    void paintSystemBars() {
        boolean night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        Window w = getWindow();
        w.setStatusBarColor(night ? Color.parseColor("#141921") : Color.WHITE);
        w.setNavigationBarColor(night ? Color.parseColor("#0d1015") : Color.parseColor("#f4f5f8"));
        if (web != null) web.setBackgroundColor(night ? Color.parseColor("#0d1015") : Color.parseColor("#f4f5f8"));
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(night ? 0 : light, light);
            }
        } else {
            View d = w.getDecorView();
            int flags = d.getSystemUiVisibility();
            int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            d.setSystemUiVisibility(night ? flags & ~light : flags | light);
        }
    }

    void finished(String id) {
        if (id == null || !id.equals(lastUtterance)) return;
        lastUtterance = null;
        runOnUiThread(new Runnable() {
            @Override public void run() { web.evaluateJavascript("window.__s73SpeechEnd&&window.__s73SpeechEnd()", null); }
        });
    }

    /** Splits long text (a whole chapter) at sentence ends so each piece fits the speech engine. */
    static List<String> chunks(String text, int max) {
        List<String> out = new ArrayList<>();
        String rest = text.trim();
        while (rest.length() > max) {
            int cut = -1;
            for (String mark : new String[]{". ", "; ", ": ", ", ", " "}) {
                cut = rest.lastIndexOf(mark, max - 2);
                if (cut > max / 3) { cut += mark.length(); break; }
                cut = -1;
            }
            if (cut <= 0) cut = max;
            out.add(rest.substring(0, cut).trim());
            rest = rest.substring(cut).trim();
        }
        if (!rest.isEmpty()) out.add(rest);
        return out;
    }

    class Bridge {
        /** Saves an image to Pictures/Seventy-Three or any other file to Downloads. Returns where, or "" on failure. */
        @JavascriptInterface
        public String saveFile(String name, String mime, String base64) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                boolean image = mime != null && mime.startsWith("image/");
                String folder = image ? Environment.DIRECTORY_PICTURES + "/Seventy-Three" : Environment.DIRECTORY_DOWNLOADS;
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, folder);
                v.put(MediaStore.MediaColumns.IS_PENDING, 1);
                ContentResolver cr = getContentResolver();
                Uri collection = image ? MediaStore.Images.Media.EXTERNAL_CONTENT_URI : MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                Uri item = cr.insert(collection, v);
                if (item == null) return "";
                try (OutputStream out = cr.openOutputStream(item)) {
                    if (out == null) return "";
                    out.write(bytes);
                }
                v.clear();
                v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                cr.update(item, v, null, null);
                return image ? "Pictures/Seventy-Three" : "Downloads";
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Seventy-Three", text));
                }
            });
        }

        @JavascriptInterface
        public boolean canSpeak() {
            return ttsReady;
        }

        @JavascriptInterface
        public void speak(String text) {
            if (!ttsReady || text == null) return;
            int max = Math.max(200, Math.min(TextToSpeech.getMaxSpeechInputLength() - 1, 3000));
            List<String> parts = chunks(text, max);
            String stamp = Long.toString(System.nanoTime());
            for (int i = 0; i < parts.size(); i++) {
                String id = stamp + "-" + i;
                if (i == parts.size() - 1) lastUtterance = id;
                tts.speak(parts.get(i), i == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, null, id);
            }
        }

        @JavascriptInterface
        public void stopSpeaking() {
            lastUtterance = null;
            if (tts != null) tts.stop();
        }
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        if (request == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(request, result, data);
    }

    /** Back goes back inside the app first (verse, profile, tab); on the main feed it leaves the app. */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__s73Back&&window.__s73Back())?1:0", new ValueCallback<String>() {
            @Override public void onReceiveValue(String handled) {
                if (!"1".equals(handled)) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
