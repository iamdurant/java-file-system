package com.file.service.impl;

import com.file.common.FileConstant;
import com.file.pojo.FileObj;
import com.file.pojo.RemoveFileDTO;
import com.file.pojo.UrlDTO;
import com.file.service.FileService;
import com.file.util.FileUtil;
import io.minio.*;
import io.minio.http.Method;
import io.minio.messages.Bucket;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {
    private final MinioClient cli;

    private final StringRedisTemplate redis;

    @Override
    @SneakyThrows
    public List<FileObj> listBuckets() {
        List<Bucket> buckets = cli.listBuckets();

        return buckets.stream().map(b -> {
            FileObj fileObj = new FileObj();

            String bucketRealName = redis.opsForValue().get(b.name());
            if(bucketRealName == null) {
                log.info("bucket: {}不存在映射，请请手动加上映射", b.name());
            }

            fileObj.setBucketName(b.name());
            fileObj.setBucketRealName(bucketRealName);
            fileObj.setBucket(true);
            return fileObj;
        }).toList();
    }

    @Override
    @SneakyThrows
    public List<FileObj> listFiles(FileObj fileObj) {
        // 查询
        Iterable<Result<Item>> results = cli.listObjects(
                ListObjectsArgs
                        .builder()
                        .bucket(fileObj.getBucketName())
                        .prefix(fileObj.getPrefix())
                        .build());

        List<FileObj> re = new ArrayList<>();
        for (Result<Item> result : results) {
            Item item = result.get();

            // 过滤.dir文件
            if (item.objectName().endsWith(FileConstant.DIR_HELP)) continue;

            FileObj obj = new FileObj();
            // 设置名称
            String[] arr = item.objectName().split("/");
            if (arr.length == 1) obj.setName(arr[0]);
            else obj.setName(arr[arr.length - 1]);

            // 设置是文件还是文件夹
            if (item.isDir()) obj.setArchive(true);
            else obj.setFile(true);


            if (!item.isDir()) {
                // 设置文件大小
                obj.setSize(item.size());

                // 设置时间
                ZonedDateTime zonedDateTime = item.lastModified();
                String datetime = zonedDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                obj.setDatetime(datetime);
            }
            re.add(obj);
        }

        return re;
    }

    @Override
    @SneakyThrows
    public Boolean uploadFile(List<MultipartFile> files, FileObj fileObj) {
        // 确保存储桶存在，如果不存在则创建
        if (!cli.bucketExists(BucketExistsArgs.builder().bucket(fileObj.getBucketName()).build())) {
            cli.makeBucket(MakeBucketArgs.builder().bucket(fileObj.getBucketName()).build());
        }

        for (MultipartFile file : files) {
            // 正确设置路径
            String prefix = fileObj.getPrefix();
            String fileName;
            if (!prefix.contains("/")) fileName = file.getOriginalFilename();
            else fileName = prefix + file.getOriginalFilename();

            cli.putObject(
                    PutObjectArgs
                            .builder()
                            .bucket(fileObj.getBucketName())
                            .object(fileName)
                            .contentType(file.getContentType())
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .build());
        }

        return true;
    }

    @Override
    @SneakyThrows
    public Boolean removeFile(RemoveFileDTO dto) {
        List<String> files = dto.getFiles();
        String prefix = dto.getPrefix();
        files.replaceAll(s -> prefix + s);

        for (String s : files) {
            if (s.endsWith("/")) {
                // 文件夹
                Iterable<Result<Item>> removed = cli.listObjects(
                        ListObjectsArgs
                                .builder()
                                .bucket(dto.getBucketName())
                                .prefix(s)
                                .recursive(true)
                                .build()
                );
                for (Result<Item> itemResult : removed) {
                    cli.removeObject(
                            RemoveObjectArgs
                                    .builder()
                                    .bucket(dto.getBucketName())
                                    .object(itemResult.get().objectName())
                                    .build()
                    );
                }
            } else {
                // 文件
                cli.removeObject(RemoveObjectArgs
                        .builder()
                        .bucket(dto.getBucketName())
                        .object(s)
                        .build());
            }
        }

        return true;
    }


    /**
     * 废弃
     *
     * @return
     */
    @Override
    @Deprecated
    public Boolean removeArchive() {
        return null;
    }

    @Override
    @SneakyThrows
    public Boolean createBucket(FileObj fileObj) {
        String b = redis.opsForValue().get(fileObj.getBucketName());
        // 检查bucket是否存在
        if(b != null) return false;

        String fakeName = FileUtil.generateBucketName();
        // 检查bucket是否存在
        if (cli.bucketExists(BucketExistsArgs.builder().bucket(fakeName).build())) {
            return false;
        }

        cli.makeBucket(MakeBucketArgs.builder().bucket(fakeName).build());
        redis.opsForValue().set(fakeName, fileObj.getBucketName());
        redis.opsForValue().set(fileObj.getBucketName(), "1");
        return true;
    }

    @Override
    @SneakyThrows
    public Boolean createArchive(FileObj fileObj) {
        cli.putObject(PutObjectArgs.builder()
                .bucket(fileObj.getBucketName())
                .object(fileObj.getPrefix() + FileConstant.DIR_HELP)
                .contentType("application/x-directory")
                .stream(new ByteArrayInputStream(new byte[]{}), 0, -1)
                .build());

        return true;
    }

    @Override
    public String getFileUrl(UrlDTO dto) {
        try {
            Iterable<Result<Item>> objs = cli.listObjects(ListObjectsArgs
                    .builder()
                    .bucket(dto.getBucketName())
                    .prefix(dto.getPrefix() + dto.getName())
                    .build());
            for (Result<Item> obj : objs) {
                Item item = obj.get();
                if(item.isDir()) {
                    log.info("用户存在错误操作，尝试下载文件夹");
                    return null;
                }
            }
        } catch (Exception ignored) {}

        try {
            String url = cli.getPresignedObjectUrl(GetPresignedObjectUrlArgs
                    .builder()
                    .bucket(dto.getBucketName())
                    .object(dto.getPrefix() + dto.getName())
                    .method(Method.GET)
                    .expiry(1, TimeUnit.DAYS)
                    .build());
            log.info("获取文件url: bucket: {}，object: {}" ,
                    dto.getBucketName(),
                    dto.getPrefix() + dto.getName());
            return url;
        } catch (Exception e) {
            log.error("获取文件url出错: bucket: {}，object: {}" ,
                    dto.getBucketName(),
                    dto.getPrefix() + dto.getName());
            return null;
        }
    }

    @Override
    public com.file.common.Result removeBucket(String bucketName) {
        String fakeName = redis.opsForValue().get(bucketName);
        if(fakeName == null) return com.file.common.Result.fail(FileConstant.TRY_REMOVE_UN_EXIST_BUCKET);

        try {
            cli.removeBucket(
                    RemoveBucketArgs
                            .builder()
                            .bucket(bucketName)
                            .build());
        } catch (Exception e) {
            return com.file.common.Result.fail(e.getMessage());
        }

        // 可以删除bucket
        redis.delete(bucketName);
        String s = redis.opsForValue().get(fakeName);
        if(s != null) redis.delete(fakeName);

        return com.file.common.Result.ok();
    }
}
