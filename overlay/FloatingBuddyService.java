package com.wavelord.whatweeating;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

public class FloatingBuddyService extends Service {

    private WindowManager windowManager;
    private View floatingView;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() { // ✅ FIXED - was int, now void
        super.onCreate();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        ImageView buddy = new ImageView(this);
        buddy.setImageResource(android.R.drawable.ic_dialog_info);
        buddy.setBackgroundResource(android.R.drawable.btn_default);
        buddy.setPadding(24, 24, 24, 24);

        final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            180,
            180,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 300;

        floatingView = buddy;

        buddy.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private long downTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        downTime = System.currentTimeMillis();
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(floatingView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        // Tap = open app
                        if (System.currentTimeMillis() - downTime < 200) {
                            Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
                            if (launch != null) {
                                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(launch);
                            }
                        }
                        return true;
                }
                return false;
            }
        });

        windowManager.addView(floatingView, params);
        // ✅ REMOVED: return START_STICKY; - not allowed in void onCreate()
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY; // ✅ MOVED HERE - this is where it belongs
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingView != null) {
            try { windowManager.removeView(floatingView); } catch (Exception e) {}
        }
    }
                                                     }
