package com.file.common;


import lombok.extern.slf4j.Slf4j;

import java.io.File;

@Slf4j
public class FileConstant {
    public static final String FILE_UPLOAD_FAIL = "文件上传失败，请稍后再试";

    public static final String BUCKET_UN_EXIST = "未指定存储桶";

    public static final String PREFIX_IS_EMPTY = "未指定前缀";

    public static final String FAIL_TO_CREATE_ARCHIVE = "创建文件夹失败";

    public static final String DIR_HELP = ".dir";

    public static final String FAIL_TO_CREATE_BUCKET = "存储桶已存在";

    public static final String SERVER_ERROR = "服务器开小差了";

    public static final String FILE_REMOVE_ERROR = "文件删除异常，可能部分文件未成功删除";

    public static final String FILE_DOWNLOAD_ERROR = "下载异常";

    public static final String TRY_REMOVE_UN_EXIST_BUCKET = "当前桶不存在";

    public static String CHUNK_TMP_DIR = "/file_system_chunk_tmp_dir";

    public static String CHUNK_FINAL_DIR = "/file_system_chunk_final_dir";

    static {
        FileConstant.CHUNK_TMP_DIR = System.getProperty("user.dir") + FileConstant.CHUNK_TMP_DIR;
        FileConstant.CHUNK_FINAL_DIR = System.getProperty("user.dir") + FileConstant.CHUNK_FINAL_DIR;

        File tmp = new File(CHUNK_TMP_DIR);
        if(!tmp.exists()) {
            boolean done = tmp.mkdir();
            if(!done) log.error("chunk临时目录创建失败");
        }

        File fi = new File(CHUNK_FINAL_DIR);
        if(!fi.exists()) {
            boolean done = fi.mkdir();
            if(!done) log.error("chunk临时目录创建失败");
        }
    }
}
