package com.file.controller;

import com.file.common.FileConstant;
import com.file.common.Result;
import com.file.pojo.FileObj;
import com.file.pojo.RemoveFileDTO;
import com.file.pojo.UrlDTO;
import com.file.service.FileService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/file")
@RequiredArgsConstructor
@Slf4j
@Api(tags = {"接口大全"})
public class FileController {
    private final FileService service;

    @PostMapping("/upload")
    @ApiOperation("上传文件")
    public Result uploadFile(@RequestBody List<MultipartFile> files,
                             @RequestParam("bucket") String bucket,
                             @RequestParam("prefix") String prefix) {
        if(bucket == null || bucket.isEmpty()) return Result.fail(FileConstant.BUCKET_UN_EXIST);
        if(prefix == null) return Result.fail(FileConstant.PREFIX_IS_EMPTY);

        FileObj fileObj = new FileObj();
        fileObj.setPrefix(prefix);
        fileObj.setBucketName(bucket);

        Boolean re = service.uploadFile(files, fileObj);

        return re ? Result.ok() : Result.fail(FileConstant.FILE_UPLOAD_FAIL);
    }

    @GetMapping("/listBuckets")
    @ApiOperation("列出所有bucket")
    public Result listBuckets() {
        List<FileObj> fileObjs = service.listBuckets();
        return Result.ok(fileObjs);
    }

    @PostMapping("/listFiles")
    @ApiOperation("列出某目录下的所有文件")
    public Result listFiles(@RequestBody FileObj fileObj) {
        if(fileObj.getBucketName() == null || fileObj.getBucketName().isEmpty())
            return Result.fail(FileConstant.BUCKET_UN_EXIST);

        List<FileObj> fileObjs = service.listFiles(fileObj);
        return Result.ok(fileObjs);
    }

    @PostMapping("/createArchive")
    @ApiOperation("创建文件夹")
    public Result createArchive(@RequestBody FileObj fileObj) {
        Boolean b = service.createArchive(fileObj);
        return  b ? Result.ok() : Result.fail(FileConstant.FAIL_TO_CREATE_ARCHIVE);
    }

    @PostMapping("/createBucket")
    @ApiOperation("创建bucket")
    public Result createBucket(@RequestParam String bucketName) {
        FileObj fileObj = new FileObj();
        fileObj.setBucketName(bucketName);
        Boolean b = service.createBucket(fileObj);

        return b ? Result.ok() : Result.fail(FileConstant.FAIL_TO_CREATE_BUCKET);
    }

    @PostMapping("/removeFilesObjs")
    @ApiOperation("批量删除文件或者文件夹")
    public Result removeFilesObjs(@RequestBody RemoveFileDTO dto) {
        Boolean b = service.removeFile(dto);

        return b ? Result.ok() : Result.fail(FileConstant.FILE_REMOVE_ERROR);
    }

    @PostMapping("/fileUrl")
    @ApiOperation("获取文件url")
    public Result getFileUrl(@RequestBody UrlDTO dto) {
        String url = service.getFileUrl(dto);
        if(url == null) return Result.fail(FileConstant.FILE_DOWNLOAD_ERROR);
        return Result.ok(url);
    }

    @PostMapping("/removeBucket")
    @ApiOperation("移除bucket")
    public Result removeBucket(@RequestParam String bucketName) {
        return service.removeBucket(bucketName);
    }
}
