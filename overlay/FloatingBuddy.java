package com.wavelord.whatweeating;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

public class FloatingBuddy {

    private final Context context;
    private final WindowManager windowManager;
    private final WindowManager.LayoutParams params;

    private View bubbleView;
    private View menuView;
    private WindowManager.LayoutParams menuParams;
    private boolean isShowing = false;
    private boolean isExpanded = false;
    private static boolean globalBubbleShowing = false;
    private ObjectAnimator bounceAnim = null;

    public FloatingBuddy(Context context, WindowManager windowManager, WindowManager.LayoutParams params) {
        this.context = context;
        this.windowManager = windowManager;
        this.params = params;
    }

    public void show() {
        if (isShowing) {
            return;
        }
        if (globalBubbleShowing) {
            return;
        }
        bubbleView = makeIconBubble();
        try {
            windowManager.addView(bubbleView, params);
        } catch (Exception e) {
            return;
        }
        isShowing = true;
        globalBubbleShowing = true;
        bounceAnim = ObjectAnimator.ofFloat(bubbleView, "translationY", 0f, -12f);
        bounceAnim.setDuration(900);
        bounceAnim.setRepeatCount(ValueAnimator.INFINITE);
        bounceAnim.setRepeatMode(ValueAnimator.REVERSE);
        bounceAnim.start();
    }

    public void hide() {
        if (isShowing == false && globalBubbleShowing == false) {
            return;
        }
        if (bounceAnim != null) {
            try {
                bounceAnim.cancel();
            } catch (Exception e) {
            }
            bounceAnim = null;
        }
        try {
            if (isExpanded && menuView != null) {
                windowManager.removeView(menuView);
            }
        } catch (Exception e) {
        }
        try {
            if (bubbleView != null) {
                windowManager.removeView(bubbleView);
            }
        } catch (Exception e) {
        }
        bubbleView = null;
        menuView = null;
        menuParams = null;
        isShowing = false;
        isExpanded = false;
        globalBubbleShowing = false;
    }

    private View makeIconBubble() {
        ImageView bubble = new ImageView(context);
        try {
            Drawable icon = context.getPackageManager().getApplicationIcon(context.getPackageName());
            bubble.setImageDrawable(icon);
        } catch (PackageManager.NameNotFoundException e) {
            bubble.setImageResource(android.R.drawable.sym_def_app_icon);
        }
        bubble.setScaleType(ImageView.ScaleType.CENTER_CROP);
        bubble.setPadding(0, 0, 0, 0);
        int size = (int) (68 * context.getResources().getDisplayMetrics().density);
        bubble.setLayoutParams(new WindowManager.LayoutParams(size, size));

        bubble.setOnTouchListener(new View.OnTouchListener() {
            private int lastX;
            private int lastY;
            private float downX;
            private float downY;
            private long downTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (event.getAction() == MotionEvent.ACTION_DOWN) {
                    downTime = System.currentTimeMillis();
                    lastX = params.x;
                    lastY = params.y;
                    downX = event.getRawX();
                    downY = event.getRawY();
                    if (bounceAnim != null) {
                        try {
                            bounceAnim.cancel();
                        } catch (Exception e) {
                        }
                        bounceAnim = null;
                    }
                    return true;
                }
                if (event.getAction() == MotionEvent.ACTION_MOVE) {
                    params.x = lastX - (int) (event.getRawX() - downX);
                    params.y = lastY - (int) (event.getRawY() - downY);
                    try {
                        windowManager.updateViewLayout(bubbleView, params);
                    } catch (Exception e) {
                    }
                    if (isExpanded && menuView != null && menuParams != null) {
                        menuParams.x = params.x;
                        menuParams.y = params.y + 80;
                        try {
                            windowManager.updateViewLayout(menuView, menuParams);
                        } catch (Exception e) {
                        }
                    }
                    return true;
                }
                if (event.getAction() == MotionEvent.ACTION_UP) {
                    if (bounceAnim == null && bubbleView != null) {
                        bounceAnim = ObjectAnimator.ofFloat(bubbleView, "translationY", 0f, -12f);
                        bounceAnim.setDuration(900);
                        bounceAnim.setRepeatCount(ValueAnimator.INFINITE);
                        bounceAnim.setRepeatMode(ValueAnimator.REVERSE);
                        bounceAnim.start();
                    }
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
        if (isExpanded) {
            collapse();
        } else {
            expand();
        }
    }

    private void expand() {
        if (isExpanded) {
            return;
        }
        LinearLayout menu = new LinearLayout(context);
        menu.setOrientation(LinearLayout.VERTICAL);
        menu.setBackgroundColor(Color.parseColor("#1A0F0D"));
        menu.setPadding(30, 30, 30, 30);
        menu.addView(makeMenuButton("Ask AI - What We Eating?", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openApp();
                collapse();
            }
        }));
        menu.addView(makeMenuButton("Back To App", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openApp();
                collapse();
            }
        }));
        menu.addView(makeMenuButton("Minimize To Bubble", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                collapse();
            }
        }));
        menu.addView(makeMenuButton("Exit Buddy", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
                    context.stopService(new Intent(context, FloatingBuddyService.class));
                } catch (Exception e) {
                }
            }
        }));
        menuParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            params.type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT);
        menuParams.gravity = Gravity.BOTTOM | Gravity.END;
        menuParams.x = params.x;
        menuParams.y = params.y + 80;
        menuView = menu;
        try {
            windowManager.addView(menuView, menuParams);
        } catch (Exception e) {
            return;
        }
        isExpanded = true;
    }

    private void collapse() {
        if (isExpanded == false) {
            return;
        }
        try {
            windowManager.removeView(menuView);
        } catch (Exception e) {
        }
        menuView = null;
        menuParams = null;
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
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            context.startActivity(launch);
        }
    }

    public static WindowManager.LayoutParams createParams() {
        int type;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            type = WindowManager.LayoutParams.TYPE_PHONE;
        }
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT);
        p.gravity = Gravity.BOTTOM | Gravity.END;
        p.x = 20;
        p.y = 220;
        return p;
    }
                                                 }
