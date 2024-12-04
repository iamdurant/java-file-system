package com.file.listener;


import org.apache.tomcat.util.http.fileupload.ProgressListener;

/**
 * minio 未提供监听上传功能
 */
@Deprecated
public class UploadProgressListener implements ProgressListener {
    @Override
    public void update(long l, long l1, int i) {

    }
}
