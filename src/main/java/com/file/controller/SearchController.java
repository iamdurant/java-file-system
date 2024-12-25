package com.file.controller;

import com.file.common.Result;
import com.file.service.SearchService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Slf4j
@RequestMapping("/search")
@Api(tags = "搜索相关接口")
@RequiredArgsConstructor
public class SearchController {
    private final SearchService service;

    @PostMapping("/file")
    @ApiOperation("搜索文件")
    public Result searchFile(@RequestParam String name) {
        if(name == null || name.isEmpty()) return Result.fail("请输入搜索内容");

        log.info("搜索文件: {}", name);
        return service.searchFile(name);
    }
}
