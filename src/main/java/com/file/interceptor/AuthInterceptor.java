package com.file.interceptor;

import com.auth0.jwt.interfaces.Claim;
import com.file.util.JwtUtil;
import org.jetbrains.annotations.NotNull;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Date;
import java.util.Map;

public class AuthInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull Object handler) throws Exception {
        String token = request.getHeader("token");
        if(token == null) {
            response.sendRedirect("/auth.html");
            return false;
        }

        Map<String, Claim> claims = JwtUtil.decrypt(token);
        long exp = claims.get("exp").asDate().getTime();
        if(exp > new Date().getTime()) {
            response.sendRedirect("/auth.html");
            return false;
        }

        return true;
    }
}
