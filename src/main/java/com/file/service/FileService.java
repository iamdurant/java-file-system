package com.file.service;


import com.baomidou.mybatisplus.extension.service.IService;
import com.file.common.Result;
import com.file.entity.File;
import com.file.pojo.FileObj;
import com.file.pojo.RemoveFileDTO;
import com.file.pojo.UrlDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 文件相关接口
 */
public interface FileService extends IService<File> {
    /**
     * 返回所有bucket,
     * @return
     */
    List<FileObj> listBuckets();

    /**
     * 列出某个目录或者某个桶下的所有文件或者目录
     * @param fileObj 通用对象
     * @return
     */
    List<FileObj> listFiles(FileObj fileObj);

    /**
     * 上传文件
     * @param
     * @return
     */
    Boolean uploadFile(List<MultipartFile> files, FileObj fileObj);

    /**
     * 删除文件
     * @return
     */
    Boolean removeFile(RemoveFileDTO dto);

    /**
     * 删除文件夹
     * @return
     */
    Boolean removeArchive();

    /**
     * 创建bucket
     * @param fileObj 通用对象
     * @return
     */
    Boolean createBucket(FileObj fileObj);

    /**
     * 创建文件夹
     * @param fileObj
     * @return
     */
    Boolean createArchive(FileObj fileObj);

    /**
     * 移除bucket
     * @param
     * @return
     */
    Result removeBucket(String bucketName);

    String getFileUrl(UrlDTO dto);

    /**
     * 重命名bucket
     * @param bucketName
     * @return
     */
    Result renameBucket(String bucketName, String newName);

    Result checkFileChunkStatus(String bucketName, String prefix, String fileName);

    Result uploadFileInParts(MultipartFile chunk, String bucketName, String prefix, String fileName, Long cur, Long total);

    Result getStorageInfo();
}
