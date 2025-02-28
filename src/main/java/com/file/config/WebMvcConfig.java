package com.file.config;

import com.file.interceptor.AuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor())
                .addPathPatterns("/**")
                .excludePathPatterns("/auth.html")
                .excludePathPatterns("/auth.css")
                .excludePathPatterns("/auth.js")
                .excludePathPatterns("/token.js")
                .excludePathPatterns("/svg/**")
                .excludePathPatterns("/auth/code/register")
                .excludePathPatterns("/auth/sighUp")
                .excludePathPatterns("/auth/sighIn")
                .excludePathPatterns("/auth/code/resetPass")
                .excludePathPatterns("/auth/resetPass")
                // Knife4j 相关路径
                .excludePathPatterns("/doc.html")
                .excludePathPatterns("/webjars/**")
                .excludePathPatterns("/swagger-resources/**")
                .excludePathPatterns("/v2/api-docs/**")
                .excludePathPatterns("/v3/api-docs/**");
    }
}
