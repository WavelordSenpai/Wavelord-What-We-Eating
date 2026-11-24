package com.wavelord.whatweeating;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQ_OVERLAY = 1001;

    public class AndroidBridge {
        @JavascriptInterface
        public void minimizeToBubble() {
            runOnUiThread(() -> MainActivity.this.minimizeToBubble());
        }
        @JavascriptInterface
        public void returnToApp() {
            runOnUiThread(() -> {
                Intent i = new Intent(MainActivity.this, MainActivity.class);
                i.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(i);
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Expose bridge to app.js: window.AndroidBridge.minimizeToBubble()
        // Capacitor WebView: addJavascriptInterface is on the Bridge webview
        try {
            getBridge().getWebView().addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        } catch (Exception e) {
            // WebView not ready yet, will retry in onResume
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        try {
            getBridge().getWebView().addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        } catch (Exception ignored) {}
    }

    public void minimizeToBubble() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Allow 'Draw over other apps' to use Wave Buddy bubble", Toast.LENGTH_LONG).show();
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, REQ_OVERLAY);
            return;
        }
        startBuddyService();
        moveTaskToBack(true);
        Toast.makeText(this, "Wave Buddy is floating 🍔 — tap it anytime", Toast.LENGTH_SHORT).show();
    }

    private void startBuddyService() {
        try {
            Intent i = new Intent(this, FloatingBuddyService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(i);
            } else {
                startService(i);
            }
        } catch (Exception e) {
            Toast.makeText(this, "Buddy failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_OVERLAY) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startBuddyService();
                moveTaskToBack(true);
            } else {
                Toast.makeText(this, "Buddy needs overlay permission", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
