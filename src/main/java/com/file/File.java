package com.file;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan(value = {"com.file.mapper"})
public class File {
    public static void main(String[] args) {
        SpringApplication.run(File.class, args);
    }
}
