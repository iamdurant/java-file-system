package com.file;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.ServletComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan(value = {"com.file.mapper"})
@ServletComponentScan
@EnableScheduling
public class File {
    public static void main(String[] args) {
        SpringApplication.run(File.class, args);
    }
}
