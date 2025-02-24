package com.file.controller;

import com.file.common.Result;
import com.file.pojo.UserDTO;
import com.file.service.IUserService;
import com.file.util.EncryptUtil;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@Api(tags = "用户相关接口")
@RequestMapping("/auth")
public class AuthController {
    private final IUserService userService;

    private final EncryptUtil encryptUtil;

    @PostMapping("/code")
    @ApiOperation("获取注册验证码")
    public Result getVerificationCode(@RequestParam("email") String email) {
        if(email == null || email.isEmpty()) return Result.fail("邮箱不能为空");

        return userService.getVerificationCode(email);
    }

    @PostMapping("/sighUp")
    @ApiOperation("注册")
    public Result sighUp(@RequestBody UserDTO userInfo) {
        if(userInfo.getEmail() == null || userInfo.getEmail().isEmpty())
            return Result.fail("邮箱不能为空");
        if(userInfo.getPassword() == null || userInfo.getPassword().isEmpty())
            return Result.fail("密码不能为空");
        if(userInfo.getPassword().length() < 8)
            return Result.fail("密码不能低于八位数");
        if(!encryptUtil.passStrongEnough(userInfo.getPassword()))
            return Result.fail("密码必须同时包含英文大小写与数字");

        return userService.sighUp(userInfo);
    }

    @PostMapping("/sighIn")
    @ApiOperation("用户登录")
    public Result sighIn(@RequestBody UserDTO userInfo) {
        if(userInfo.getEmail() == null || userInfo.getEmail().isEmpty())
            return Result.fail("邮箱不能为空");
        if(userInfo.getPassword() == null || userInfo.getPassword().isEmpty())
            return Result.fail("密码不能为空");

        return userService.sighIn(userInfo);
    }
}
