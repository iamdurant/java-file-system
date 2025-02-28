package com.file.service;

import com.file.common.Result;
import com.file.entity.User;
import com.baomidou.mybatisplus.extension.service.IService;
import com.file.pojo.UserDTO;

import javax.servlet.http.HttpServletResponse;

/**
 * <p>
 * 用户表 服务类
 * </p>
 *
 * @author jasper
 * @since 2025-02-24
 */
public interface IUserService extends IService<User> {

    Result getVerificationCode(String email);

    Result sighIn(UserDTO userInfo, HttpServletResponse resp);

    Result sighUp(UserDTO userInfo);

    Result getResetPassCode(String email);

    Result resetPassword(UserDTO userInfo);

    Result logout();
}
