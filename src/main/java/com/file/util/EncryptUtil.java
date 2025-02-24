package com.file.util;

import lombok.SneakyThrows;
import org.springframework.stereotype.Component;
import org.springframework.util.Base64Utils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Random;

@Component
public class EncryptUtil {
    @SneakyThrows
    public String[] encrypt(String password) {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String salt = generateSalt();
        String pass = salt + password;
        byte[] encrypted = digest.digest(pass.getBytes(StandardCharsets.UTF_8));
        return new String[]{salt, Base64Utils.encodeToString(encrypted)};
    }

    @SneakyThrows
    public String encrypt(String salt, String password) {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String pass = salt + password;
        byte[] encrypted = digest.digest(pass.getBytes(StandardCharsets.UTF_8));
        return Base64Utils.encodeToString(encrypted);
    }

    private String generateSalt() {
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for(int i = 0;i < 16;i++) {
            sb.append((char)(random.nextInt(26) + 97));
        }
        return sb.toString();
    }

    public boolean passStrongEnough(String pass) {
        boolean[] d = new boolean[3];
        for(char c : pass.toCharArray()) {
            if(c >= 48 && c <= 57) d[0] = true;
            if(c >= 97 && c <= 122) d[1] = true;
            if(c >= 65 && c <= 90) d[2] = true;
        }
        return d[0] && d[1] && d[2];
    }
}
