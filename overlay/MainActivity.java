package com.wavelord.whatweeating;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int OVERLAY_REQUEST_CODE = 1001;
    private static boolean buddyStarted = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        checkAndStartBuddy();
    }

    @Override
    public void onResume() {
        super.onResume();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_REQUEST_CODE) {
            if (Settings.canDrawOverlays(this)) {
                startBuddyService();
            }
        }
    }

    private void checkAndStartBuddy() {
        if (buddyStarted) return;
        if (Settings.canDrawOverlays(this)) {
            startBuddyService();
        } else {
            try {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
                );
                startActivityForResult(intent, OVERLAY_REQUEST_CODE);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void startBuddyService() {
        if (buddyStarted) return;
        buddyStarted = true;
        try {
            Intent serviceIntent = new Intent(this, FloatingBuddyService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            buddyStarted = false;
            e.printStackTrace();
        }
    }
}
