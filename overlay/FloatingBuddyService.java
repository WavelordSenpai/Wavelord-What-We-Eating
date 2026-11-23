package com.wavelord.whatweeating;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.WindowManager;

public class FloatingBuddyService extends Service {

    private static final String CHANNEL_ID = "wavelord_buddy";
    private static FloatingBuddy buddy = null;
    private static boolean buddyCreated = false;

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            createNotificationChannel();
            startForeground(1, buildNotification());
        } catch (Exception e) {
        }
        try {
            if (Settings.canDrawOverlays(this) == false) {
                return;
            }
        } catch (Exception e) {
            return;
        }
        if (buddyCreated && buddy != null) {
            return;
        }
        if (buddyCreated) {
            return;
        }
        buddyCreated = true;
        try {
            WindowManager wm = (WindowManager) getSystemService(WINDOW_SERVICE);
            WindowManager.LayoutParams params = FloatingBuddy.createParams();
            buddy = new FloatingBuddy(this, wm, params);
            buddy.show();
        } catch (Exception e) {
            buddy = null;
            buddyCreated = false;
        }
    }

    private Notification buildNotification() {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        builder.setContentTitle("What We Eating?");
        builder.setContentText("Wave Buddy is active");
        builder.setSmallIcon(android.R.drawable.sym_def_app_icon);
        builder.setOngoing(true);
        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Wave Buddy", NotificationManager.IMPORTANCE_LOW);
            NotificationManager m = getSystemService(NotificationManager.class);
            if (m != null) {
                m.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (buddy != null) {
                buddy.hide();
                buddy = null;
            }
        } catch (Exception e) {
        }
        buddyCreated = false;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
