package com.file.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.file.ThreadPool.FileUploadThreadPool;
import com.file.common.FileConstant;
import com.file.mapper.BucketMapper;
import com.file.pojo.FileChunkVO;
import com.file.pojo.FileObj;
import com.file.pojo.RemoveFileDTO;
import com.file.pojo.UrlDTO;
import com.file.service.FileService;
import com.file.util.BaseContext;
import com.file.util.DatetimeUtil;
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

import java.io.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;


@Service
@Slf4j
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {
    private final MinioClient cli;

    private final StringRedisTemplate redis;

    private final FileUploadThreadPool pool;

    private final BucketMapper bucketMapper;

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
                obj.setDatetime(DatetimeUtil.format(item.lastModified()));
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

        CountDownLatch latch = new CountDownLatch(files.size());
        for (MultipartFile file : files) {
            pool.submitTask(() -> {
                // 正确设置路径
                String prefix = fileObj.getPrefix();
                String fileName;
                if (!prefix.contains("/")) fileName = file.getOriginalFilename();
                else fileName = prefix + file.getOriginalFilename();

                try {
                    cli.putObject(
                            PutObjectArgs
                                    .builder()
                                    .bucket(fileObj.getBucketName())
                                    .object(fileName)
                                    .contentType(file.getContentType())
                                    .stream(file.getInputStream(), file.getSize(), -1)
                                    .build());
                } catch (Exception e) {
                    latch.countDown();
                    throw new RuntimeException(e);
                }
                latch.countDown();
            });
        }

        latch.await();
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
     * @return null
     */
    @Override
    @Deprecated
    public Boolean removeArchive() {
        return null;
    }

    @Override
    @SneakyThrows
    public Boolean createBucket(FileObj fileObj) {
        // 检查bucket_fake_name是否存在
        com.file.entity.Bucket bucket = bucketMapper.selectOne(new LambdaQueryWrapper<com.file.entity.Bucket>()
                .eq(com.file.entity.Bucket::getBucketFakeName, fileObj.getBucketName()));
        if(bucket != null) return false;

        // 生成bucket_real_name
        String bucketRealName = FileUtil.generateBucketName();
        while(
                bucketMapper.selectOne(new LambdaQueryWrapper<com.file.entity.Bucket>()
                        .eq(com.file.entity.Bucket::getBucketRealName, bucketRealName)) != null
        ) bucketRealName = FileUtil.generateBucketName();

        // 构造对象
        com.file.entity.Bucket entity = new com.file.entity.Bucket();
        entity.setCreateDate(LocalDateTime.now());
        entity.setBucketFakeName(fileObj.getBucketName());
        entity.setBucketRealName(bucketRealName);

        // 存储
        entity.setUserId(BaseContext.getUserInfo().getId());
        int i = bucketMapper.insert(entity);
        if(i != 1) return false;

        return true;
    }

    @Override
    @SneakyThrows
    public Boolean createArchive(FileObj fileObj) {
        if(fileObj.getBucketName() == null || fileObj.getBucketName().isEmpty())
            return false;

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

    @Override
    public com.file.common.Result renameBucket(String bucketName, String newName) {
        String oldName = redis.opsForValue().get(bucketName);
        if(oldName == null) return com.file.common.Result.fail("存储桶不存在");

        String newNameExisted = redis.opsForValue().get(newName);
        if(newNameExisted != null) return com.file.common.Result.fail("此名称已被使用");

        redis.delete(oldName);
        redis.delete(bucketName);
        redis.opsForValue().set(bucketName, newName);
        redis.opsForValue().set(newName, "1");

        return com.file.common.Result.ok();
    }

    @Override
    public com.file.common.Result checkFileChunkStatus(String bucketName, String prefix, String fileName) {
        // 检查存储桶内是否存在同名文件
        String prefixAndName = prefix != null && !prefix.isEmpty() ?
                prefix.endsWith("/") ? prefix + fileName : prefix + "/" + fileName
                : fileName;
        FileChunkVO chunkVO = new FileChunkVO();
        chunkVO.setBucketName(bucketName);
        chunkVO.setPrefix(prefix);
        chunkVO.setFineName(fileName);
        try {
            cli.getObject(GetObjectArgs
                    .builder()
                    .bucket(bucketName)
                    .object(prefixAndName)
                    .build());
        } catch (Exception e) {
            File dir = new File(FileConstant.CHUNK_TMP_DIR + "\\" + fileName);
            if(!dir.exists()) {
                // 文件不存在，也没有chunk存在
                chunkVO.setChunkIndex(0L);
                return com.file.common.Result.ok(chunkVO);
            }

            // 存在chunk
            List<Long> chunks = Arrays.stream(Objects.requireNonNull(dir.listFiles()))
                    .map(f -> Long.valueOf(f.getName()))
                    .toList();
            long max = 0;
            for(Long idx : chunks) max = Math.max(max, idx);
            chunkVO.setChunkIndex(++max);

            return com.file.common.Result.ok(chunkVO);
        }

        chunkVO.setChunkIndex(-1L);
        return com.file.common.Result.ok(chunkVO);
    }

    @Override
    @SneakyThrows
    public com.file.common.Result uploadFileInParts(MultipartFile chunk, String bucketName, String prefix, String fileName, Long cur, Long total) {
        File fileDir = new File(FileConstant.CHUNK_TMP_DIR + "\\" + fileName);
        if(!fileDir.exists()) {
            boolean b = fileDir.mkdir();
            if(!b) {
                log.warn("创建临时目录异常：{}", fileName);
                return com.file.common.Result.fail("服务器开小差了");
            }
        }

        File part = new File(FileConstant.CHUNK_TMP_DIR + "\\" + fileName + "\\" + cur);
        boolean created = part.createNewFile();
        if(!created) log.warn("创建分片文件失败：{}:{}", fileName, cur);
        try (FileOutputStream outputStream = new FileOutputStream(part)) {
            outputStream.write(chunk.getBytes());
        }

        if(cur == total - 1) {
            boolean mergedAndUploaded = mergeChunks(bucketName, prefix, fileName);
            if(!mergedAndUploaded) {
                return com.file.common.Result.fail("上传失败");
            }
        }

        return com.file.common.Result.ok();
    }

    private boolean mergeChunks(String bucketName, String prefix, String fileName) {
        File dir = new File(FileConstant.CHUNK_TMP_DIR + "\\" + fileName);
        File[] chunks = dir.listFiles();
        try (FileOutputStream out = new FileOutputStream(FileConstant.CHUNK_FINAL_DIR + "\\" + fileName)) {
            if(chunks != null) {
                Arrays.sort(chunks, Comparator.comparing(n -> Integer.valueOf(n.getName())));
                for(File ch : chunks) {
                    try (FileInputStream in = new FileInputStream(ch)) {
                        in.transferTo(out);
                    } catch (IOException e) {
                        log.warn("chunk合并异常，文件: {}", fileName);
                    }
                }

                // do Upload
                String prefixAndName = prefix != null && !prefix.isEmpty() ?
                        prefix.endsWith("/") ? prefix + fileName : prefix + "/" + fileName
                        : fileName;
                try (FileInputStream in = new FileInputStream(FileConstant.CHUNK_FINAL_DIR + "\\" + fileName)) {
                    cli.putObject(PutObjectArgs
                            .builder()
                            .bucket(bucketName)
                            .object(prefixAndName)
                            .stream(in, in.available(), -1)
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("合并上传异常，文件：{}", fileName);
        }

        // clean cache
        assert chunks != null;
        for (File ch : chunks) {
            boolean d = ch.delete();
            if(!d) log.warn("删除失败，{}:{}", fileName, ch.getName());
        }
        boolean d = dir.delete();
        if(!d) log.warn("文件临时目录删除失败，{}", fileName);

        boolean completedFileDeleted = new File(FileConstant.CHUNK_FINAL_DIR + "\\" + fileName).delete();
        if(!completedFileDeleted) log.warn("{}上传完成，cache清除失败", fileName);

        return true;
    }
}
