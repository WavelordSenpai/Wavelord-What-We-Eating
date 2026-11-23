package com.wavelord.whatweeating;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;

public class MainActivity extends com.getcapacitor.BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            startBuddyIfAllowed();
        } catch (Exception e) {
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            startBuddyIfAllowed();
        } catch (Exception e) {
        }
    }

    private void startBuddyIfAllowed() {
        try {
            if (Settings.canDrawOverlays(this) == false) {
                return;
            }
            Intent intent = new Intent(this, FloatingBuddyService.class);
            try {
                startForegroundService(intent);
            } catch (Exception e) {
                try {
                    startService(intent);
                } catch (Exception e2) {
                }
            }
        } catch (Exception e) {
        }
    }
}
