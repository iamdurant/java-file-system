package com.file.interceptor;

import com.auth0.jwt.interfaces.Claim;
import com.file.entity.User;
import com.file.util.BaseContext;
import com.file.util.JwtUtil;
import org.jetbrains.annotations.NotNull;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Date;
import java.util.Map;

public class AuthInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull Object handler) throws Exception {
        String token = null;
        Cookie[] cookies = request.getCookies();
        if(cookies != null) {
            for (Cookie cookie : cookies) {
                if(cookie.getName().equals("token")) token = cookie.getValue();
            }
        }

        if(token == null) {
            // 未登录
            response.sendRedirect("/auth.html");
            return false;
        }

        Map<String, Claim> claims = JwtUtil.decrypt(token);
        long exp = claims.get("exp").asDate().getTime();
        if(exp < new Date().getTime()) {
            // token已过期
            response.sendRedirect("/auth.html");
            return false;
        }

        // 存储基本信息到ThreadLocal
        User user = new User();
        user.setId(Long.valueOf(claims.get("userId").asString()));
        user.setEmail(claims.get("email").asString());
        BaseContext.setUserInfo(user);

        return true;
    }

    @Override
    public void postHandle(@NotNull HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull Object handler, ModelAndView modelAndView) throws Exception {
        BaseContext.removeUserInfo();
    }
}
