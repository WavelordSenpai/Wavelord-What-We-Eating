package com.wavelord.whatweeating;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.Gravity;
import android.view.WindowManager;

public class FloatingBuddyService extends Service {

    private WindowManager windowManager;
    private FloatingBuddy floatingBuddy;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onCreate() {
        super.onCreate();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            180,
            180,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 300;

        floatingBuddy = new FloatingBuddy(this, windowManager, params);
        windowManager.addView(floatingBuddy, params);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingBuddy != null) {
            try { windowManager.removeView(floatingBuddy); } catch (Exception e) {}
        }
    }
}
