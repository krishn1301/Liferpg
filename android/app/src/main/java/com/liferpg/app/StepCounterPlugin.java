package com.liferpg.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Reads the hardware step counter.
 *
 * Written here rather than pulled in as a dependency because the whole feature
 * is one sensor and one number, and every other native capability in this app
 * comes from an official @capacitor/* package. A community health plugin would
 * add a Play Services surface and a Health Connect dependency to read a value
 * the platform already exposes directly.
 *
 * TYPE_STEP_COUNTER is a *cumulative* count since the device last booted, not a
 * daily total. It is maintained in hardware, so it keeps counting while the app
 * is closed and costs no battery to leave alone — but it resets to zero on
 * reboot, and turning that into "steps today" is arithmetic that belongs in
 * testable JavaScript rather than in here. This class answers exactly one
 * question: what does the counter say right now.
 */
@CapacitorPlugin(
    name = "StepCounter",
    permissions = {
        @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION })
    }
)
public class StepCounterPlugin extends Plugin {

    /**
     * How long to wait for the sensor to report.
     *
     * The fallback, not the mechanism — `flush` below is what actually makes a
     * stationary phone answer. This only covers the case where the sensor stays
     * silent anyway, because resolving with `available: false` beats hanging the
     * caller forever. The JavaScript side treats a timeout exactly like a
     * missing sensor: leave the number alone, never write a zero.
     */
    private static final long READ_TIMEOUT_MS = 4000;

    /** Tagged so a failed read can be told apart from a read of zero. */
    private static final String TAG = "LifeRPGSteps";

    /** Below API 29 the permission does not exist and is granted implicitly. */
    private boolean needsRuntimePermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
    }

    private boolean granted() {
        if (!needsRuntimePermission()) return true;
        return getContext().checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)
            == PackageManager.PERMISSION_GRANTED;
    }

    private Sensor counter() {
        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        return sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject out = new JSObject();
        out.put("granted", granted());
        // A phone with no pedometer is not a phone with a denied permission, and
        // the two need different copy on screen.
        out.put("available", counter() != null);
        call.resolve(out);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (!needsRuntimePermission() || granted()) {
            checkPermission(call);
            return;
        }
        requestPermissionForAlias("activity", call, "permissionResult");
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        checkPermission(call);
    }

    /**
     * The counter's current value, in steps since boot.
     *
     * Resolves with `available: false` rather than rejecting when there is no
     * sensor, no permission, or no reading in time. A missing step count is a
     * normal state for this app — it degrades to a habit tracker without steps —
     * so it is not modelled as an error the caller has to catch.
     */
    @PluginMethod
    public void read(PluginCall call) {
        if (!granted() || counter() == null) {
            JSObject out = new JSObject();
            out.put("available", false);
            out.put("granted", granted());
            call.resolve(out);
            return;
        }

        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        Handler handler = new Handler(Looper.getMainLooper());
        OneShotRead listener = new OneShotRead(sm, handler, call);

        sm.registerListener(listener, counter(), SensorManager.SENSOR_DELAY_FASTEST);

        // The step counter batches. Samsung's especially: it holds readings in a
        // hardware FIFO and delivers them in bursts to avoid waking the CPU for
        // every footfall, which means a phone sitting still can register a
        // listener and hear nothing at all. Found exactly that way — the first
        // build read nothing on a stationary desk. `flush` empties the FIFO now
        // and delivers what is in it, which is the difference between a step
        // count that appears when you open the app and one that appears
        // whenever the hardware next feels like it.
        sm.flush(listener);

        handler.postDelayed(listener::giveUp, READ_TIMEOUT_MS);
    }

    /**
     * One reading, then unregister.
     *
     * A named class rather than an anonymous one so the timeout can call
     * `giveUp` on it. `settled` guards the single resolve: the sensor can fire
     * after the timeout has already answered, and resolving a PluginCall twice
     * throws.
     */
    private static final class OneShotRead implements SensorEventListener {
        private final SensorManager sm;
        private final Handler handler;
        private final PluginCall call;
        private boolean settled = false;

        OneShotRead(SensorManager sm, Handler handler, PluginCall call) {
            this.sm = sm;
            this.handler = handler;
            this.call = call;
        }

        @Override
        public void onSensorChanged(SensorEvent event) {
            if (settled) return;
            settled = true;
            sm.unregisterListener(this);
            handler.removeCallbacksAndMessages(null);

            JSObject out = new JSObject();
            out.put("available", true);
            out.put("granted", true);
            // float in the API, integral in fact — the sensor counts whole
            // steps and the fractional part is always zero.
            out.put("sinceBoot", (long) event.values[0]);
            Log.d(TAG, "read " + (long) event.values[0] + " steps since boot");
            call.resolve(out);
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {}

        void giveUp() {
            if (settled) return;
            settled = true;
            sm.unregisterListener(this);

            JSObject out = new JSObject();
            out.put("available", false);
            out.put("granted", true);
            Log.w(TAG, "sensor reported nothing before the timeout");
            call.resolve(out);
        }
    }
}
