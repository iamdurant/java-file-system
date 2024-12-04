package com.file.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理
 */
@RestControllerAdvice
@Slf4j
public class GlobalException {
    @ExceptionHandler(Exception.class)
    public Result catchAllException(Exception e) {
        log.error(String.valueOf(e.getCause()));
        log.error(e.getMessage());
        return Result.fail(FileConstant.SERVER_ERROR);
    }
}
