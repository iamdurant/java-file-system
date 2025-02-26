package com.file.util;

import org.jetbrains.annotations.NotNull;

import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Random;

public class FileUtil {
    private static final char[] hexArr = "0123456789abcdef".toCharArray();

    private static final MessageDigest md5;

    static {
        try {
            md5 = MessageDigest.getInstance("MD5");
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    @NotNull
    public static String generateBucketName() {
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for(int i = 0;i < 12;i++) {
            sb.append((char)(random.nextInt(26) + 97));
        }

        return sb.toString();
    }

    public static String md5Hash(byte[] bytes) {
        return FileUtil.bytesToHex(md5.digest(bytes));
    }

    public static String bytesToHex(byte[] arr) {
        char[] result = new char[arr.length * 2];
        for(int i = 0;i < arr.length;i++) {
            int a = arr[i];
            int b = arr[i];
            result[2 * i] = hexArr[a >> 4];
            result[2 * i + 1] = hexArr[b & 0x0f];
        }
        return new String(result);
    }
}
