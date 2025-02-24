package com.file.controller;

import com.file.common.Result;
import com.file.util.MailUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/mail")
public class MailTestController {
    private final MailUtil mailUtil;

    @PostMapping
    public Result testMail(@RequestParam String mailAddr) {
        mailUtil.sendCode(mailAddr);

        return Result.ok();
    }
}
