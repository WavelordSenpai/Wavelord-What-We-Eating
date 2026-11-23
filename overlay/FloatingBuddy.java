package com.wavelord.whatweeating;

import android.animation.ObjectAnimator;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
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
    private static boolean globalBubbleShowing = false;

    public FloatingBuddy(Context context, WindowManager windowManager, WindowManager.LayoutParams params) {
        this.context = context;
        this.windowManager = windowManager;
        this.params = params;
    }

    public void show() {
        if (isShowing) return;
        if (globalBubbleShowing) return;
        bubbleView = makeBurgerBubble();
        try { windowManager.addView(bubbleView, params); } catch (Exception e) { return; }
        isShowing = true;
        globalBubbleShowing = true;
        // Gentle bounce so it feels alive like the splash burger
        ObjectAnimator bounce = ObjectAnimator.ofFloat(bubbleView, "translationY", 0f, -12f, 0f);
        bounce.setDuration(900);
        bounce.setRepeatCount(ObjectAnimator.INFINITE);
        bounce.setRepeatMode(ObjectAnimator.REVERSE);
        bounce.start();
    }

    public void hide() {
        if (!isShowing && !globalBubbleShowing) return;
        try {
            if (isExpanded && menuView != null) windowManager.removeView(menuView);
            if (bubbleView != null) windowManager.removeView(bubbleView);
        } catch (Exception e) {}
        bubbleView = null; menuView = null;
        isShowing = false; isExpanded = false;
        globalBubbleShowing = false;
    }

    // Same layered burger as your splash: top bun / tomato / lettuce / cheese / patty / bottom bun
    private View makeBurgerBubble() {
        LinearLayout wrap = new LinearLayout(context);
        wrap.setOrientation(LinearLayout.VERTICAL);
        wrap.setGravity(Gravity.CENTER);
        wrap.setPadding(10, 10, 10, 10);

        wrap.addView(layer("#F5C07A", 110, 34, 30, 30, 8, 8)); // top bun
        wrap.addView(layer("#FF3B30", 92, 10, 0, 0, 0, 0));   // tomato
        wrap.addView(layer("#7CFC9A", 104, 10, 0, 0, 0, 0));  // lettuce
        wrap.addView(layer("#FFD477", 98, 10, 0, 0, 0, 0));    // cheese
        wrap.addView(layer("#8A4A22", 96, 20, 0, 0, 0, 0));    // patty
        wrap.addView(layer("#E8A04A", 104, 16, 0, 0, 8, 8));  // bottom bun

        wrap.setOnTouchListener(new View.OnTouchListener() {
            private int lastX, lastY;
            private float downX, downY;
            private long downTime;
            @Override public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        downTime = System.currentTimeMillis();
                        lastX = params.x; lastY = params.y;
                        downX = event.getRawX(); downY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = lastX + (int) (event.getRawX() - downX);
                        params.y = lastY + (int) (event.getRawY() - downY);
                        try { windowManager.updateViewLayout(bubbleView, params); } catch (Exception e) {}
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
        return wrap;
    }

    private View layer(String color, int w, int h, int tl, int tr, int bl, int br) {
        View v = new View(context);
        v.setBackgroundColor(Color.parseColor(color));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(w), dp(h));
        lp.gravity = Gravity.CENTER;
        v.setLayoutParams(lp);
        return v;
    }

    private int dp(int v) { return (int) (v * context.getResources().getDisplayMetrics().density); }

    private void toggleMenu() { if (isExpanded) collapse(); else expand(); }

    private void expand() {
        if (isExpanded) return;
        LinearLayout menu = new LinearLayout(context);
        menu.setOrientation(LinearLayout.VERTICAL);
        menu.setBackgroundColor(Color.parseColor("#1A0F0D"));
        menu.setPadding(30, 30, 30, 30);
        menu.addView(makeMenuButton("🤖 Ask AI - What We Eating?", v -> { openApp(); collapse(); }));
        menu.addView(makeMenuButton("🏠 Back To App", v -> { openApp(); collapse(); }));
        menu.addView(makeMenuButton("➖ Minimize To Bubble", v -> collapse()));
        menu.addView(makeMenuButton("❌ Exit Buddy", v -> context.stopService(new Intent(context, FloatingBuddyService.class))));

        WindowManager.LayoutParams menuParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            params.type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT);
        menuParams.gravity = Gravity.TOP | Gravity.START;
        menuParams.x = params.x;
        menuParams.y = params.y + 140;
        menuView = menu;
        try { windowManager.addView(menuView, menuParams); } catch (Exception e) { return; }
        isExpanded = true;
    }

    private void collapse() {
        if (!isExpanded) return;
        try { windowManager.removeView(menuView); } catch (Exception e) {}
        menuView = null; isExpanded = false;
    }

    private TextView makeMenuButton(String text, View.OnClickListener click) {
        TextView btn = new TextView(context);
        btn.setText(text); btn.setTextSize(16); btn.setTextColor(Color.WHITE);
        btn.setPadding(20, 24, 20, 24); btn.setOnClickListener(click);
        return btn;
    }

    private void openApp() {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            context.startActivity(launch);
        }
    }

    public static WindowManager.LayoutParams createParams() {
        int type = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT);
        // BOTTOM-RIGHT, NOT top / centre - so it can NEVER sit on Tap To Eat / top button
        p.gravity = Gravity.BOTTOM | Gravity.END;
        p.x = 20;
        p.y = 220;
        return p;
    }
}
