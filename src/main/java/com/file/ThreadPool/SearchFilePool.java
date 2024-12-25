package com.file.ThreadPool;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.concurrent.*;

@Component
@Getter
@Slf4j
public class SearchFilePool {
    private ExecutorService executor;

    public SearchFilePool() {
        log.info("searchFilePool init succeed");
    }

    @PostConstruct
    void initPoll() {
        this.executor = new ThreadPoolExecutor(
                6,
                12,
                8,
                TimeUnit.SECONDS,
                new LinkedBlockingDeque<>(2048),
                Executors.defaultThreadFactory(),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    public void submitTask(Runnable task) {
        executor.submit(task);
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
