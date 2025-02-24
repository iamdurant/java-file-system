package com.file.service;

import com.file.common.Result;
import com.file.entity.User;
import com.baomidou.mybatisplus.extension.service.IService;
import com.file.pojo.UserDTO;

/**
 * <p>
 * 用户表 服务类
 * </p>
 *
 * @author jasper
 * @since 2025-02-24
 */
public interface IUserService extends IService<User> {

    Result sighUp(UserDTO userInfo);

    Result sighIn(UserDTO userInfo);

    Result verifyCode(String email, String code);
}
