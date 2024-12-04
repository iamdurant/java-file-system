package com.file.ThreadPool;

import org.springframework.stereotype.Component;

import java.util.concurrent.*;

@Component
public class UploadThreadPool {
    private final ThreadPoolExecutor executor;

    public UploadThreadPool() {
        this.executor = new ThreadPoolExecutor(
                8,
                16,
                60,
                TimeUnit.SECONDS,
                new LinkedBlockingDeque<>(1024),
                Executors.defaultThreadFactory(),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    public void submitTask(Runnable task) {
        executor.execute(task);
    }

    public void shutdown() {
        executor.shutdown();
    }

    // 检查线程池是否已关闭
    public boolean isShutdown() {
        return executor.isShutdown();
    }

    // 检查线程池是否已终止
    public boolean isTerminated() {
        return executor.isTerminated();
    }
}
