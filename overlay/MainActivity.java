package com.wavelord.whatweeating;

import android.content.Intent;
import android.os.Bundle;
import androidx.core.content.ContextCompat;

public class MainActivity extends com.getcapacitor.BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Start icon bubble - only once
        try {
            Intent i = new Intent(this, FloatingBuddyService.class);
            ContextCompat.startForegroundService(this, i);
        } catch (Exception e) {}
    }
}
