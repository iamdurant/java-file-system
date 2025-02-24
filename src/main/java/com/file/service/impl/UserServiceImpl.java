package com.file.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.file.common.Result;
import com.file.entity.User;
import com.file.mapper.UserMapper;
import com.file.pojo.UserDTO;
import com.file.service.IUserService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.file.util.EncryptUtil;
import com.file.util.JwtUtil;
import com.file.util.MailUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.concurrent.TimeUnit;

/**
 * <p>
 * 用户表 服务实现类
 * </p>
 *
 * @author jasper
 * @since 2025-02-24
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements IUserService {
    private final UserMapper userMapper;

    private final StringRedisTemplate redis;

    private final EncryptUtil encryptUtil;

    private final MailUtil mailUtil;

    private final String codeKeyPrefix = "code:";

    @Override
    public Result getVerificationCode(String email) {
        String exists = redis.opsForValue().get(codeKeyPrefix + email);
        if(exists != null) return Result.fail("验证码还未过期，请勿重复请求");

        User userExists = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getEmail, email));
        if(userExists != null) return Result.fail("此邮箱已被注册");

        String code = mailUtil.generateCode();
        mailUtil.sendCode(code, email);
        redis.opsForValue().set(codeKeyPrefix + email, code, 60, TimeUnit.SECONDS);

        return Result.ok("验证码发送成功");
    }

    @Override
    public Result sighUp(UserDTO userInfo) {
        String storedCode = redis.opsForValue().get(codeKeyPrefix + userInfo.getCode());
        if(storedCode == null || storedCode.isEmpty()) return Result.fail("验证码过期，请重新获取验证码");

        if(!userInfo.getCode().equals(storedCode)) return Result.fail("验证码错误");

        User user = new User();
        user.setEmail(userInfo.getEmail());
        user.setCreateDate(LocalDateTime.now());

        String[] saltAndEncryptedPass = encryptUtil.encrypt(user.getPassword());
        user.setSalt(saltAndEncryptedPass[0]);
        user.setPassword(saltAndEncryptedPass[1]);

        int i = userMapper.insert(user);
        if(i != 1) return Result.fail("出错了，请稍后重新注册");

        return Result.ok("注册成功");
    }

    @Override
    public Result sighIn(UserDTO userInfo) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getEmail, userInfo.getEmail()));
        if(user == null) return Result.fail("用户不存在");

        String encryptedPass = encryptUtil.encrypt(user.getSalt(), userInfo.getPassword());
        if(!encryptedPass.equals(user.getPassword())) return Result.fail("密码错误");

        HashMap<String, Object> map = new HashMap<>();
        map.put("email", userInfo.getEmail());
        String token = JwtUtil.token(map);

        return Result.ok(token);
    }
}
