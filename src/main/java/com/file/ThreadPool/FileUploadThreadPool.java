package com.file.ThreadPool;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.concurrent.*;

/**
 * 文件上传线程池
 * 对性能提升不大，上传文件到minio，毕竟是io密集型操作
 */
@Component
@Slf4j
public class FileUploadThreadPool {
    private ExecutorService service;

    public FileUploadThreadPool(){}

    @PostConstruct
    void init() {
        this.service = new ThreadPoolExecutor(
                6,
                12,
                16,
                TimeUnit.SECONDS,
                new LinkedBlockingDeque<>(2048),
                Executors.defaultThreadFactory(),
                new ThreadPoolExecutor.AbortPolicy()
        );
        log.info("fileUploadThreadPool init succeed");
    }

    public void submitTask(Runnable task) {
        service.submit(task);
    }
}
