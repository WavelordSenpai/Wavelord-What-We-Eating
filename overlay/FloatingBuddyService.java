package com.wavelord.whatweeating;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.view.WindowManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class FloatingBuddyService extends Service {

    private static final String CHANNEL_ID = "wavelord_buddy";
    private static FloatingBuddy buddy = null;
    private static boolean buddyCreated = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(1, buildNotification());

        // STATIC GUARD - if Android restarts this Service, do NOT make a 2nd buddy
        if (buddyCreated && buddy != null) {
            return;
        }
        if (buddyCreated) {
            return;
        }
        buddyCreated = true;

        WindowManager wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        WindowManager.LayoutParams params = FloatingBuddy.createParams();
        buddy = new FloatingBuddy(this, wm, params);
        buddy.show();
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("What We Eating?")
            .setContentText("Wave Buddy is active 🍔")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Wave Buddy", NotificationManager.IMPORTANCE_LOW);
            NotificationManager m = getSystemService(NotificationManager.class);
            if (m != null) m.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Do NOT recreate buddy here - onCreate already did it once
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (buddy != null) {
            buddy.hide();
            buddy = null;
        }
        buddyCreated = false;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
