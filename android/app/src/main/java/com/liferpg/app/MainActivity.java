package com.liferpg.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins are not discovered the way the @capacitor/* packages
        // are — those register through their own gradle module. This one lives
        // in the app, so it has to be named before the bridge starts.
        registerPlugin(StepCounterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
