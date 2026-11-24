package com.wavelord.whatweeating;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;

public class FloatingBuddyService extends Service {
    private static final String CH = "buddy_channel";
    private static final int NOTIF_ID = 1001;
    private FloatingBuddy buddy;
    private WindowManager wm;
    private LinearLayout menuView;
    private WindowManager.LayoutParams menuParams;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIF_ID, makeNotification());
        showBubble();
        return START_STICKY;
    }

    private Notification makeNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CH, "Wave Buddy", NotificationManager.IMPORTANCE_LOW);
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);
        }
        Intent i = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CH)
            .setContentTitle("Wave Buddy is floating 🍔")
            .setContentText("Tap the bubble to return to the app")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pi)
            .setOngoing(true)
            .build();
    }

    private void showBubble() {
        if (buddy != null) return;
        buddy = new FloatingBuddy(this, () -> showMenu());
        buddy.show();
    }

    private void showMenu() {
        if (menuView != null) { hideMenu(); return; }
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        menuParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT);
        menuParams.gravity = Gravity.CENTER;

        menuView = new LinearLayout(this);
        menuView.setOrientation(LinearLayout.VERTICAL);
        menuView.setBackgroundResource(android.R.drawable.dialog_holo_light_frame);
        menuView.setPadding(24, 24, 24, 24);

        TextView title = new TextView(this);
        title.setText("🍔 Wave Buddy");
        title.setTextSize(18);
        title.setPadding(0, 0, 0, 16);
        menuView.addView(title);

        menuView.addView(makeBtn("↩️ Return to App", () -> {
            hideMenu();
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(i);
        }));
        menuView.addView(makeBtn("💬 Talk to AI", () -> {
            hideMenu();
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            i.putExtra("openBuddy", true);
            startActivity(i);
        }));
        menuView.addView(makeBtn("❌ Exit App Completely", () -> {
            hideMenu();
            if (buddy != null) { buddy.hide(); buddy = null; }
            stopForeground(true);
            stopSelf();
            // Kill app process — bubble + app both gone
            android.os.Process.killProcess(android.os.Process.myPid());
        }));
        menuView.addView(makeBtn("✕ Close Menu", this::hideMenu));

        try { wm.addView(menuView, menuParams); } catch (Exception ignored) {}
    }

    private TextView makeBtn(String label, Runnable onClick) {
        TextView b = new TextView(this);
        b.setText(label);
        b.setTextSize(16);
        b.setPadding(16, 20, 16, 20);
        b.setOnClickListener(v -> onClick.run());
        return b;
    }

    private void hideMenu() {
        if (menuView != null && wm != null) {
            try { wm.removeView(menuView); } catch (Exception ignored) {}
            menuView = null;
        }
    }

    @Override
    public void onDestroy() {
        hideMenu();
        if (buddy != null) { buddy.hide(); buddy = null; }
        super.onDestroy();
    }
}
