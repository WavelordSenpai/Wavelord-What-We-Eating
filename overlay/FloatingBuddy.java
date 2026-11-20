package com.wavelord.whatweeating;

import android.content.Context;
import android.content.Intent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

public class FloatingBuddy extends ImageView {

    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private int initialX, initialY;
    private float initialTouchX, initialTouchY;
    private long downTime;

    public FloatingBuddy(Context context, WindowManager wm, WindowManager.LayoutParams p) {
        super(context);
        this.windowManager = wm;
        this.params = p;

        setImageResource(android.R.drawable.ic_dialog_info);
        setBackgroundResource(android.R.drawable.btn_default);
        setPadding(24, 24, 24, 24);

        setOnTouchListener(new OnTouchListener() {
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
                        windowManager.updateViewLayout(FloatingBuddy.this, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (System.currentTimeMillis() - downTime < 200) {
                            Intent launch = getContext().getPackageManager().getLaunchIntentForPackage(getContext().getPackageName());
                            if (launch != null) {
                                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                getContext().startActivity(launch);
                            }
                        }
                        return true;
                }
                return false;
            }
        });
    }
                }
