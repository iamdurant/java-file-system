package com.file.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.file.common.Result;
import com.file.entity.User;
import com.file.mapper.UserMapper;
import com.file.pojo.UserDTO;
import com.file.service.IUserService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.file.util.BaseContext;
import com.file.util.EncryptUtil;
import com.file.util.JwtUtil;
import com.file.util.MailUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;
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

    private final String registerCodeKeyPrefix = "register:code:";

    private final String resetPassCodeKeyPrefix = "resetPass:code:";

    private final String tokenPrefix = "token:";

    @Override
    public Result getVerificationCode(String email) {
        String exists = redis.opsForValue().get(registerCodeKeyPrefix + email);
        if(exists != null) return Result.fail("验证码还未过期，请勿重复请求");

        User userExists = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getEmail, email));
        if(userExists != null) return Result.fail("此邮箱已被注册");

        String code = mailUtil.generateCode();
        mailUtil.sendCode("欢迎注册AnoCloud", code, email);
        redis.opsForValue().set(registerCodeKeyPrefix + email, code, 60, TimeUnit.SECONDS);

        return Result.ok("验证码发送成功");
    }

    @Override
    public Result sighUp(UserDTO userInfo) {
        String storedCode = redis.opsForValue().get(registerCodeKeyPrefix + userInfo.getEmail());
        if(storedCode == null || storedCode.isEmpty()) return Result.fail("验证码过期，请重新获取验证码");

        if(!userInfo.getCode().equals(storedCode)) return Result.fail("验证码错误");

        User user = new User();
        user.setEmail(userInfo.getEmail());
        user.setCreateDate(LocalDateTime.now());

        String[] saltAndEncryptedPass = encryptUtil.encrypt(userInfo.getPassword());
        user.setSalt(saltAndEncryptedPass[0]);
        user.setPassword(saltAndEncryptedPass[1]);

        int i = userMapper.insert(user);
        if(i != 1) return Result.fail("出错了，请稍后重新注册");

        // 移除验证码
        redis.delete(registerCodeKeyPrefix +  userInfo.getEmail());

        return Result.ok("注册成功");
    }

    @Override
    public Result sighIn(UserDTO userInfo, HttpServletResponse resp) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getEmail, userInfo.getEmail()));
        if(user == null) return Result.fail("用户不存在");

        String encryptedPass = encryptUtil.encrypt(user.getSalt(), userInfo.getPassword());
        if(!encryptedPass.equals(user.getPassword())) return Result.fail("密码错误");

        HashMap<String, Object> map = new HashMap<>();
        // 自定义claims存与jwt_payload中
        map.put("userId", user.getId());
        map.put("email", userInfo.getEmail());
        String token = JwtUtil.token(map);

        Cookie cookie = new Cookie("token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        // 七天有效期，与token保持一致
        cookie.setMaxAge(86400 * 7);
        resp.addCookie(cookie);

        // 若存在其他设备登陆，则将其他设备踢下线
        redis.delete(tokenPrefix + user.getId());
        // 存储token
        redis.opsForValue().set(tokenPrefix + user.getId(), token);

        return Result.ok("登陆成功");
    }

    @Override
    public Result getResetPassCode(String email) {
        String kv = redis.opsForValue().get(resetPassCodeKeyPrefix + email);
        if(kv != null) return Result.fail("验证码还未过期，请勿重复请求");

        User userExists = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getEmail, email));
        if(userExists == null) return Result.fail("此账号不存在");

        String code = mailUtil.generateCode();
        mailUtil.sendCode("重置密码", code, email);
        redis.opsForValue().set(resetPassCodeKeyPrefix + email, code, 60, TimeUnit.SECONDS);

        return Result.ok("验证码发送成功");
    }

    @Override
    public Result resetPassword(UserDTO userInfo) {
        String code = redis.opsForValue().get(resetPassCodeKeyPrefix + userInfo.getEmail());
        if(code == null) return Result.fail("验证码已过期");
        if(!code.equals(userInfo.getCode())) return Result.fail("验证码错误");

        User user = new User();
        user.setEmail(userInfo.getEmail());
        // 重新加密新密码
        String[] saltAndEncryptedPass = encryptUtil.encrypt(userInfo.getPassword());
        user.setSalt(saltAndEncryptedPass[0]);
        user.setPassword(saltAndEncryptedPass[1]);

        int i = userMapper.update(user, new LambdaQueryWrapper<User>()
                .eq(User::getEmail, user.getEmail()));
        if(i != 1) return Result.fail("重置密码失败，请稍后重试");

        // 移除验证码
        redis.delete(resetPassCodeKeyPrefix + userInfo.getEmail());

        return Result.ok("密码重置成功");
    }

    @Override
    public Result logout() {
        redis.delete(tokenPrefix + BaseContext.getUserInfo().getId());
        return Result.ok();
    }
}
