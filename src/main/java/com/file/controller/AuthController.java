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

import javax.servlet.http.HttpServletResponse;

@Slf4j
@RestController
@RequiredArgsConstructor
@Api(tags = "用户相关接口")
@RequestMapping("/auth")
public class AuthController {
    private final IUserService userService;

    private final EncryptUtil encryptUtil;

    @PostMapping("/code/register")
    @ApiOperation("获取注册验证码")
    public Result getVerificationCode(@RequestParam("email") String email) {
        if(email == null || email.isEmpty()) return Result.fail("邮箱不能为空");

        return userService.getVerificationCode(email);
    }

    @PostMapping("/sighUp")
    @ApiOperation("注册")
    public Result sighUp(@RequestBody UserDTO userInfo) {
        Object[] re = checkUserInfo(userInfo);
        if(!((boolean) re[0])) return Result.fail(re[1].toString());

        return userService.sighUp(userInfo);
    }

    @PostMapping("/sighIn")
    @ApiOperation("用户登录")
    public Result sighIn(@RequestBody UserDTO userInfo, HttpServletResponse resp) {
        if(userInfo.getEmail() == null || userInfo.getEmail().isEmpty())
            return Result.fail("邮箱不能为空");
        if(userInfo.getPassword() == null || userInfo.getPassword().isEmpty())
            return Result.fail("密码不能为空");

        return userService.sighIn(userInfo, resp);
    }

    @PostMapping("/code/resetPass")
    @ApiOperation("获取重置密码验证码")
    public Result getResetPassCode(@RequestParam("email") String email) {
        if(email == null || email.isEmpty()) return Result.fail("邮箱不能为空");

        return userService.getResetPassCode(email);
    }

    @PostMapping("/resetPass")
    @ApiOperation("重置密码")
    public Result resetPassword(@RequestBody UserDTO userInfo) {
        Object[] re = checkUserInfo(userInfo);
        if(!((boolean) re[0])) return Result.fail(re[1].toString());

        return userService.resetPassword(userInfo);
    }

    private Object[] checkUserInfo(UserDTO userInfo) {
        Object[] re = new Object[2];
        re[0] = true;
        if(userInfo.getEmail() == null || userInfo.getEmail().isEmpty()) {
            re[0] = false;
            re[1] = "邮箱不能为空";
        }
        if(userInfo.getPassword() == null || userInfo.getPassword().isEmpty()) {
            re[0] = false;
            re[1] = "密码不能为空";
        }
        if(userInfo.getPassword().length() < 8) {
            re[0] = false;
            re[1] = "密码不能低于八位数";
        }
        if(!encryptUtil.passStrongEnough(userInfo.getPassword())) {
            re[0] = false;
            re[1] = "密码必须同时包含英文大小写与数字";
        }
        return re;
    }
}
