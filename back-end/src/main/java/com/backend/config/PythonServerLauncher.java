package com.backend.config;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.net.Socket;

/**
 * Tự động khởi chạy Python AI Examiner (viva-ai-v2 / FastAPI) khi Spring Boot khởi động.
 * Khi Spring Boot tắt hoặc dừng trong IDE, tiến trình Python sẽ được giải phóng sạch sẽ.
 */
@Slf4j
@Component
public class PythonServerLauncher {

    @Value("${python.server.auto-start:true}")
    private boolean autoStart;

    @Value("${python.server.port:8000}")
    private int pythonPort;

    private Process pythonProcess;

    @EventListener(ApplicationReadyEvent.class)
    public void startPythonServerOnStartup() {
        if (!autoStart) {
            log.info("[PythonLauncher] Auto-start Python AI Server is disabled in config.");
            return;
        }

        if (isPortInUse("127.0.0.1", pythonPort)) {
            log.info("[PythonLauncher] Python AI Server (viva-ai-v2) is ALREADY running on port {}.", pythonPort);
            return;
        }

        log.info("[PythonLauncher] Detecting and starting Python AI Server (FastAPI) on port {}...", pythonPort);

        try {
            // Tìm thư mục python tương đối từ thư mục làm việc của back-end
            File pythonDir = new File("../python").getCanonicalFile();
            if (!pythonDir.exists()) {
                pythonDir = new File("python").getCanonicalFile();
            }

            if (!pythonDir.exists()) {
                log.warn("[PythonLauncher] Cannot find 'python' directory at {}. Skipping auto-start.", pythonDir.getAbsolutePath());
                return;
            }

            // Ưu tiên sử dụng python trong virtual environment (.venv)
            File venvPythonWin = new File(pythonDir, ".venv/Scripts/python.exe");
            File venvPythonUnix = new File(pythonDir, ".venv/bin/python");

            String pythonExec = "python";
            if (venvPythonWin.exists()) {
                pythonExec = venvPythonWin.getAbsolutePath();
            } else if (venvPythonUnix.exists()) {
                pythonExec = venvPythonUnix.getAbsolutePath();
            }

            ProcessBuilder pb = new ProcessBuilder(pythonExec, "run.py");
            pb.directory(pythonDir);
            pb.redirectOutput(ProcessBuilder.Redirect.INHERIT);
            pb.redirectError(ProcessBuilder.Redirect.INHERIT);

            pythonProcess = pb.start();
            log.info("[PythonLauncher] Python AI Server started successfully with PID: {} using executable: {}",
                    pythonProcess.pid(), pythonExec);

        } catch (Exception e) {
            log.error("[PythonLauncher] Failed to auto-start Python AI Server: {}", e.getMessage(), e);
        }
    }

    private boolean isPortInUse(String host, int port) {
        try (Socket socket = new Socket(host, port)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    @PreDestroy
    public void stopPythonServer() {
        if (pythonProcess != null && pythonProcess.isAlive()) {
            log.info("[PythonLauncher] Stopping Python AI Server process (PID: {})...", pythonProcess.pid());
            pythonProcess.destroy();
            try {
                Thread.sleep(1000);
            } catch (InterruptedException ignored) {}
            if (pythonProcess.isAlive()) {
                pythonProcess.destroyForcibly();
            }
            log.info("[PythonLauncher] Python AI Server process stopped.");
        }
    }
}
