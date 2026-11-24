package com.wavelord.whatweeating;

import android.content.Context;
import android.graphics.PixelFormat;
import android.os.Build;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

public class FloatingBuddy {
    private final Context ctx;
    private final WindowManager wm;
    private final WindowManager.LayoutParams params;
    private ImageView bubble;
    private int startX, startY;
    private float touchX, touchY;
    private boolean moved = false;
    private OnTapListener listener;

    public interface OnTapListener { void onTap(); }

    public FloatingBuddy(Context ctx, OnTapListener listener) {
        this.ctx = ctx;
        this.listener = listener;
        this.wm = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        params = new WindowManager.LayoutParams(
            180, 180, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 80;
        params.y = 400;
    }

    public void show() {
        if (bubble != null) return;
        bubble = new ImageView(ctx);
        // Uses mipmap icon as bubble image — always exists
        bubble.setImageResource(R.mipmap.ic_launcher);
        bubble.setScaleType(ImageView.ScaleType.CENTER_CROP);
        // Make it round-ish with padding
        bubble.setPadding(12, 12, 12, 12);
        bubble.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent ev) {
                switch (ev.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        startX = params.x; startY = params.y;
                        touchX = ev.getRawX(); touchY = ev.getRawY();
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE: {
                        int dx = (int)(ev.getRawX() - touchX);
                        int dy = (int)(ev.getRawY() - touchY);
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) moved = true;
                        params.x = startX + dx;
                        params.y = startY + dy;
                        wm.updateViewLayout(bubble, params);
                        return true;
                    }
                    case MotionEvent.ACTION_UP:
                        if (!moved && listener != null) listener.onTap();
                        return true;
                }
                return false;
            }
        });
        try { wm.addView(bubble, params); } catch (Exception ignored) {}
    }

    public void hide() {
        if (bubble != null) {
            try { wm.removeView(bubble); } catch (Exception ignored) {}
            bubble = null;
        }
    }
            }
