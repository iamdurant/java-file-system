package com.file.util;

import com.file.entity.User;

public class BaseContext {
    private static final ThreadLocal<User> context = new ThreadLocal<>();

    public static void setUserInfo(User user) {
        context.set(user);
    }

    public static User getUserInfo() {
        return context.get();
    }

    public static void removeUserInfo() {
        context.remove();
    }
}
