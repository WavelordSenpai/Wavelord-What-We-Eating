package com.wavelord.whatweeating;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (!Settings.canDrawOverlays(this)) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } else {
            startService(new Intent(this, FloatingBuddyService.class));
        }
    }

    @Override
    public void onResume() { // ✅ was protected
        super.onResume();
        if (Settings.canDrawOverlays(this)) {
            try { startService(new Intent(this, FloatingBuddyService.class)); }
            catch (Exception e) { e.printStackTrace(); }
        }
    }
}
