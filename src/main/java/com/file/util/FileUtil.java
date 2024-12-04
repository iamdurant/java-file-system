package com.file.util;

import org.jetbrains.annotations.NotNull;

import java.util.Random;

public class FileUtil {
    @NotNull
    public static String generateBucketName() {
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for(int i = 0;i < 12;i++) {
            sb.append((char)(random.nextInt(26) + 97));
        }

        return sb.toString();
    }
}
