package com.wavelord.whatweeating;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

public class FloatingBuddy {

    private final Context context;
    private final WindowManager windowManager;
    private final WindowManager.LayoutParams params;

    private View bubbleView;
    private View menuView;
    private boolean isShowing = false;
    private boolean isExpanded = false;

    public FloatingBuddy(Context context, WindowManager windowManager, WindowManager.LayoutParams params) {
        this.context = context;
        this.windowManager = windowManager;
        this.params = params;
    }

    public void show() {
        if (isShowing) return;
        bubbleView = makeBubble();
        windowManager.addView(bubbleView, params);
        isShowing = true;
    }

    public void hide() {
        if (!isShowing) return;
        try {
            if (isExpanded && menuView != null) windowManager.removeView(menuView);
            if (bubbleView != null) windowManager.removeView(bubbleView);
        } catch (Exception e) {}
        isShowing = false;
        isExpanded = false;
    }

    private View makeBubble() {
        TextView bubble = new TextView(context);
        bubble.setText("🍔");
        bubble.setTextSize(30);
        bubble.setGravity(Gravity.CENTER);
        bubble.setBackgroundColor(Color.parseColor("#FF4D2E"));
        bubble.setPadding(20, 20, 20, 20);

        bubble.setOnTouchListener(new View.OnTouchListener() {
            private int lastX, lastY;
            private float downX, downY;
            private long downTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        downTime = System.currentTimeMillis();
                        lastX = params.x;
                        lastY = params.y;
                        downX = event.getRawX();
                        downY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = lastX + (int) (event.getRawX() - downX);
                        params.y = lastY + (int) (event.getRawY() - downY);
                        windowManager.updateViewLayout(bubbleView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (System.currentTimeMillis() - downTime < 200
                            && Math.abs(event.getRawX() - downX) < 10
                            && Math.abs(event.getRawY() - downY) < 10) {
                            toggleMenu();
                        }
                        return true;
                }
                return false;
            }
        });
        return bubble;
    }

    private void toggleMenu() {
        if (isExpanded) collapse();
        else expand();
    }

    private void expand() {
        if (isExpanded) return;
        LinearLayout menu = new LinearLayout(context);
        menu.setOrientation(LinearLayout.VERTICAL);
        menu.setBackgroundColor(Color.parseColor("#1A0F0D"));
        menu.setPadding(30, 30, 30, 30);

        menu.addView(makeMenuButton("🤖 Ask AI - What We Eating?", new View.OnClickListener() {
            @Override public void onClick(View v) { openApp(); collapse(); }
        }));
        menu.addView(makeMenuButton("🏠 Back To App", new View.OnClickListener() {
            @Override public void onClick(View v) { openApp(); collapse(); }
        }));
        menu.addView(makeMenuButton("➖ Minimize To Bubble", new View.OnClickListener() {
            @Override public void onClick(View v) { collapse(); }
        }));
        menu.addView(makeMenuButton("❌ Exit Buddy", new View.OnClickListener() {
            @Override public void onClick(View v) {
                context.stopService(new Intent(context, FloatingBuddyService.class));
            }
        }));

        WindowManager.LayoutParams menuParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            params.type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            android.graphics.PixelFormat.TRANSLUCENT
        );
        menuParams.gravity = Gravity.TOP | Gravity.START;
        menuParams.x = params.x;
        menuParams.y = params.y + 120;

        menuView = menu;
        windowManager.addView(menuView, menuParams);
        isExpanded = true;
    }

    private void collapse() {
        if (!isExpanded) return;
        try { windowManager.removeView(menuView); } catch (Exception e) {}
        menuView = null;
        isExpanded = false;
    }

    private TextView makeMenuButton(String text, View.OnClickListener click) {
        TextView btn = new TextView(context);
        btn.setText(text);
        btn.setTextSize(16);
        btn.setTextColor(Color.WHITE);
        btn.setPadding(20, 24, 20, 24);
        btn.setOnClickListener(click);
        return btn;
    }

    private void openApp() {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(launch);
        }
    }

    public static WindowManager.LayoutParams createParams() {
        int type = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            android.graphics.PixelFormat.TRANSLUCENT
        );
        p.gravity = Gravity.TOP | Gravity.START;
        p.x = 0;
        p.y = 300;
        return p;
    }
}
