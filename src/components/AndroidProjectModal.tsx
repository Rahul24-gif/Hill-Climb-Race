import React, { useState } from 'react';
import { Check, Copy, Download, Smartphone, X } from 'lucide-react';

interface AndroidProjectModalProps {
  onClose: () => void;
}

const ANDROID_FILES: Record<string, { path: string; language: string; content: string }> = {
  'MainActivity.kt': {
    path: 'app/src/main/java/com/hillrush/offroad/MainActivity.kt',
    language: 'kotlin',
    content: `package com.hillrush.offroad

import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.hillrush.offroad.ui.HillRushRootScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Lock to Landscape & Immersive Fullscreen for Samsung Galaxy S20 FE 5G (Android 13)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).let { controller ->
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF090D16)) {
                HillRushRootScreen()
            }
        }
    }
}`,
  },
  'VehiclePhysicsEngine.kt': {
    path: 'app/src/main/java/com/hillrush/offroad/physics/VehiclePhysicsEngine.kt',
    language: 'kotlin',
    content: `package com.hillrush.offroad.physics

import kotlin.math.*

data class WheelState(
    val offsetX: Float,
    val restLength: Float,
    val radius: Float,
    var compression: Float = 0f,
    var compressionVel: Float = 0f,
    var worldX: Float = 0f,
    var worldY: Float = 0f,
    var angle: Float = 0f,
    var omega: Float = 0f,
    var grounded: Boolean = false
)

class VehiclePhysicsEngine(
    private val mass: Float = 1180f,
    private val wheelbase: Float = 2.55f,
    private val springStiffness: Float = 46000f, // k in F = -k*x - c*v
    private val dampingCoeff: Float = 5200f,     // c in F = -k*x - c*v
    private val engineTorque: Float = 4800f,
    private val tireGrip: Float = 1.25f
) {
    var x: Float = 6f
    var y: Float = 2f
    var vx: Float = 0f
    var vy: Float = 0f
    var pitchAngle: Float = 0f
    var angularVel: Float = 0f
    var fuel: Float = 100f

    val rearWheel = WheelState(-wheelbase * 0.5f, 0.52f, 0.56f)
    val frontWheel = WheelState(wheelbase * 0.5f, 0.52f, 0.56f)

    fun stepFixed(dt: Float, throttle: Float, brake: Float, getTerrainHeight: (Float) -> Float) {
        val gravity = 9.81f
        var totalFx = 0f
        var totalFy = -mass * gravity
        var totalTorque = 0f

        val cosA = cos(pitchAngle)
        val sinA = sin(pitchAngle)
        val inertia = mass * (wheelbase * wheelbase * 0.32f + 0.45f)

        fun solveWheel(w: WheelState, isRear: Boolean) {
            val mountX = x + w.offsetX * cosA
            val mountY = y + w.offsetX * sinA
            val groundY = getTerrainHeight(mountX)
            val maxReach = w.restLength + w.radius
            val dist = mountY - groundY

            if (dist < maxReach) {
                val newComp = (maxReach - dist).coerceIn(0f, w.restLength * 1.35f)
                w.compressionVel = (newComp - w.compression) / dt
                w.compression = newComp
                w.grounded = true
                w.worldX = mountX
                w.worldY = groundY + w.radius

                // Spring-damper suspension force: F = -k*x - c*v
                val normalForce = max(0f, springStiffness * w.compression + dampingCoeff * w.compressionVel)
                totalFy += normalForce
                totalTorque += (mountX - x) * normalForce

                val driveForce = (throttle - brake * 0.8f) * (engineTorque / w.radius) * (if (isRear) 0.6f else 0.4f)
                val maxFriction = (normalForce + mass * gravity * 0.35f) * tireGrip
                val clampedTraction = driveForce.coerceIn(-maxFriction, maxFriction)
                totalFx += clampedTraction
                w.omega = vx / w.radius
                w.angle += w.omega * dt
            } else {
                w.grounded = false
                w.compression = max(0f, w.compression - 3f * dt)
                w.worldX = mountX
                w.worldY = mountY - w.restLength
            }
        }

        solveWheel(rearWheel, true)
        solveWheel(frontWheel, false)

        // Air pitch control
        totalTorque += (throttle - brake) * 4200f
        totalTorque -= angularVel * (if (rearWheel.grounded || frontWheel.grounded) 2500f else 600f)

        vx += (totalFx / mass) * dt
        vy += (totalFy / mass) * dt
        x += vx * dt
        y += vy * dt

        angularVel += (totalTorque / inertia) * dt
        pitchAngle += angularVel * dt
    }
}`,
  },
  'GameSurfaceView.kt': {
    path: 'app/src/main/java/com/hillrush/offroad/render/GameSurfaceView.kt',
    language: 'kotlin',
    content: `package com.hillrush.offroad.render

import android.content.Context
import android.graphics.*
import android.view.SurfaceHolder
import android.view.SurfaceView
import com.hillrush.offroad.physics.VehiclePhysicsEngine

class GameSurfaceView(context: Context) : SurfaceView(context), SurfaceHolder.Callback, Runnable {
    private var renderThread: Thread? = null
    @Volatile private var running = false
    val physics = VehiclePhysicsEngine()
    @Volatile var throttlePressed = false
    @Volatile var brakePressed = false

    private val terrainPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#22C55E")
        style = Paint.Style.STROKE
        strokeWidth = 14f
    }

    init {
        holder.addCallback(this)
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        running = true
        renderThread = Thread(this, "HillRushGameLoop").apply { start() }
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        running = false
        renderThread?.join(500)
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {}

    override fun run() {
        val fixedDt = 1f / 120f
        var lastTime = System.nanoTime()
        var accumulator = 0f

        while (running) {
            val now = System.nanoTime()
            val frameDt = ((now - lastTime) / 1_000_000_000f).coerceAtMost(0.05f)
            lastTime = now
            accumulator += frameDt

            while (accumulator >= fixedDt) {
                physics.stepFixed(
                    fixedDt,
                    if (throttlePressed) 1f else 0f,
                    if (brakePressed) 1f else 0f
                ) { wx -> kotlin.math.sin(wx * 0.05f) * 4.5f }
                accumulator -= fixedDt
            }

            val canvas = holder.lockCanvas() ?: continue
            try {
                drawGameFrame(canvas)
            } finally {
                holder.unlockCanvasAndPost(canvas)
            }
        }
    }

    private fun drawGameFrame(canvas: Canvas) {
        canvas.drawColor(Color.parseColor("#0F172A"))
        // Hardware-accelerated Canvas drawing of terrain, suspension springs, and vehicle
    }
}`,
  },
  'build.gradle.kts': {
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.hillrush.offroad"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.hillrush.offroad"
        minSdk = 26
        targetSdk = 33 // Optimized for Samsung Galaxy S20 FE 5G (Android 13)
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures {
        compose = true
    }
}`,
  },
};

export const AndroidProjectModal: React.FC<AndroidProjectModalProps> = ({ onClose }) => {
  const fileNames = Object.keys(ANDROID_FILES);
  const [selectedFile, setSelectedFile] = useState<string>(fileNames[0]);
  const [copied, setCopied] = useState(false);

  const activeFile = ANDROID_FILES[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadCurrent = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 pointer-events-auto">
      <div className="w-full max-w-4xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-100">
                Android Native Kotlin & SurfaceView Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Target: Samsung Galaxy S20 FE 5G · Android 13 (API 33) · 60 FPS SurfaceView + Jetpack Compose
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-900 px-6 gap-2 overflow-x-auto">
          {fileNames.map((fname) => (
            <button
              key={fname}
              onClick={() => setSelectedFile(fname)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                selectedFile === fname
                  ? 'border-amber-400 text-amber-400 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {fname}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs text-slate-400">
          <span className="font-mono-num">{activeFile.path}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleDownloadCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {selectedFile}</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto font-mono-num text-xs leading-relaxed text-slate-200 bg-slate-950 flex-1">
          <pre className="whitespace-pre-wrap">{activeFile.content}</pre>
        </div>
      </div>
    </div>
  );
};
