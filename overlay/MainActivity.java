package com.wavelord.whatweeating;

import 【entity-android¦canonical_name=Android】.content.Intent;
import 【entity-android¦canonical_name=Android】.net.Uri;
import 【entity-android¦canonical_name=Android】.os.Build;
import 【entity-android¦canonical_name=Android】.os.Bundle;
import 【entity-android¦canonical_name=Android】.provider.Settings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int OVERLAY_REQUEST_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Don't start service here - wait for permission result
        // Just check once, don't loop
        checkAndStartBuddy();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Only try if we have permission - don't re-ask every resume
        if (Settings.canDrawOverlays(this)) {
            startBuddyService();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_REQUEST_CODE) {
            // User came back from permission screen
            if (Settings.canDrawOverlays(this)) {
                startBuddyService();
            }
            // If they said no, we just don't start Buddy - no crash, no loop
        }
    }

    private void checkAndStartBuddy() {
        if (Settings.canDrawOverlays(this)) {
            startBuddyService();
        } else {
            // Ask once, result comes back to onActivityResult
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
        try {
            Intent serviceIntent = new Intent(this, FloatingBuddyService.class);
            // Android 8+ needs startForegroundService, Android 14+ enforces it
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
