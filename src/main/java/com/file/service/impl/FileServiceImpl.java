package com.file.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.file.ThreadPool.FileUploadThreadPool;
import com.file.common.FileConstant;
import com.file.entity.Bucket;
import com.file.entity.Directory;
import com.file.mapper.BucketMapper;
import com.file.mapper.DirectoryMapper;
import com.file.mapper.FileMapper;
import com.file.mapper.UserMapper;
import com.file.pojo.*;
import com.file.service.FileService;
import com.file.util.BaseContext;
import com.file.util.DatetimeUtil;
import com.file.util.FileUtil;
import io.minio.*;

import io.minio.http.Method;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;


@Service
@Slf4j
@RequiredArgsConstructor
public class FileServiceImpl extends ServiceImpl<FileMapper, com.file.entity.File> implements FileService {
    private final MinioClient cli;

    private final StringRedisTemplate redis;

    private final FileUploadThreadPool pool;

    private final BucketMapper bucketMapper;

    private final DirectoryMapper dirMapper;

    private final FileMapper fileMapper;

    private final UserMapper userMapper;

    @Override
    @SneakyThrows
    public List<FileObj> listBuckets() {
        Long userId = BaseContext.getUserInfo().getId();
        List<com.file.entity.Bucket> buckets = bucketMapper.selectList(new LambdaQueryWrapper<com.file.entity.Bucket>()
                .eq(com.file.entity.Bucket::getUserId, userId)
                .eq(com.file.entity.Bucket::getDeleted, false));

        List<FileObj> result = new ArrayList<>();
        buckets.forEach(b -> {
            FileObj f = new FileObj();
            f.setBucket(true);
            f.setBucketName(b.getBucketRealName());
            f.setBucketRealName(b.getBucketFakeName());
            result.add(f);
        });

        return result;
    }

    @Override
    @SneakyThrows
    public List<FileObj> listFiles(FileObj fileObj) {
        Long userId = BaseContext.getUserInfo().getId();
        Long bucketId = bucketMapper.selectIdByBucketRealName(userId, fileObj.getBucketName());
        Long dirId = dirMapper.selectIdByPath(userId, bucketId, fileObj.getPrefix());

        List<FileObj> result = new ArrayList<>();
        // 查询此目录下所有文件
        List<com.file.entity.File> files = fileMapper.queryFilesByPath(userId, bucketId, dirId);
        files.forEach(f -> {
            FileObj e = new FileObj();
            e.setName(f.getName());
            e.setFile(true);
            e.setSize(f.getSize());
            e.setDatetime(DatetimeUtil.format(f.getCreateDate()));
            result.add(e);
        });

        // 查询此目录下级目录
        List<Directory> dirs = dirMapper.queryDirByPath(userId, bucketId, fileObj.getPrefix());
        dirs.forEach(d -> {
            String dirName = checkChildDir(fileObj.getPrefix().length(), d.getPath());
            if(dirName != null) {
                FileObj e = new FileObj();
                e.setName(dirName);
                e.setDatetime(DatetimeUtil.format(d.getCreateDate()));
                e.setArchive(true);
                result.add(e);
            }
        });

        return result;
    }

    private String checkChildDir(int len, String path) {
        int c = 0;
        String re = null;
        for(int i = len;i < path.length();i++) {
            if(path.charAt(i) == '/') {
                if(c > 0) return null;
                else {
                    c++;
                    re = path.substring(len, i);
                }
            }
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
    @Transactional
    public Boolean createBucket(FileObj fileObj) {
        Long userId = BaseContext.getUserInfo().getId();
        // 检查bucket_fake_name是否存在
        com.file.entity.Bucket bucket = bucketMapper.selectOne(new LambdaQueryWrapper<com.file.entity.Bucket>()
                .eq(com.file.entity.Bucket::getBucketFakeName, fileObj.getBucketName())
                .eq(com.file.entity.Bucket::getUserId, userId)
                .eq(com.file.entity.Bucket::getDeleted, false));
        if(bucket != null) return false;

        // 生成bucket_real_name
        String bucketRealName = FileUtil.generateBucketName();
        while(
                bucketMapper.selectOne(new LambdaQueryWrapper<com.file.entity.Bucket>()
                        .eq(com.file.entity.Bucket::getBucketRealName, bucketRealName)
                        .eq(com.file.entity.Bucket::getUserId, userId)
                        .eq(com.file.entity.Bucket::getDeleted, false)) != null
        ) bucketRealName = FileUtil.generateBucketName();

        int c = bucketMapper.checkExist(userId, fileObj.getBucketName());
        if(c == 1) {
            // 之前存在此存储桶，只需更新状态
            bucketMapper.updateStatus(userId, fileObj.getBucketName(), bucketRealName);
        } else {
            // 构造对象
            com.file.entity.Bucket entity = new com.file.entity.Bucket();
            entity.setCreateDate(LocalDateTime.now());
            entity.setBucketFakeName(fileObj.getBucketName());
            entity.setBucketRealName(bucketRealName);
            // 存储
            entity.setUserId(BaseContext.getUserInfo().getId());
            bucketMapper.insert(entity);
        }

        Long bucketId = bucketMapper.selectIdByBucketRealName(userId, bucketRealName);
        // 构造根目录
        dirMapper.buildRoot(userId, bucketId, LocalDateTime.now(), "");

        // minio 创建bucket
        cli.makeBucket(MakeBucketArgs.builder().bucket(bucketRealName).build());

        return true;
    }

    @Override
    @SneakyThrows
    public Boolean createArchive(FileObj fileObj) {
        Long userId = BaseContext.getUserInfo().getId();

        Long bucketId = bucketMapper.queryIdByBucketRealName(userId, fileObj.getBucketName());
        if(bucketId == null) return false;

        Directory dir = new Directory();
        dir.setUserId(userId);
        dir.setBucketId(bucketId);
        dir.setCreateDate(LocalDateTime.now());
        dir.setPath(fileObj.getPrefix());

        int i = dirMapper.insert(dir);
        if(i != 1) return false;

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
        Long userId = BaseContext.getUserInfo().getId();
        com.file.entity.Bucket existed = getBucket(userId, bucketName);
        if(existed == null || existed.getDeleted()) return com.file.common.Result.fail("bucket不存在");

        com.file.entity.Bucket bucket = new com.file.entity.Bucket();
        bucket.setDeleted(true);
        Long bucketId = bucketMapper.queryIdByBucketRealName(userId, bucketName);
        bucket.setId(bucketId);
        try {
            // 修改bucket状态为删除
            bucketMapper.updateById(bucket);

            // minio尝试删除bucket
            cli.removeBucket(RemoveBucketArgs
                    .builder()
                    .bucket(bucketName)
                    .build());

            // 删除根目录
            dirMapper.removeRoot(userId, bucketId, "");
        } catch (Exception e) {
            // 重置状态
            bucket.setDeleted(true);
            int i = bucketMapper.update(bucket,
                    new LambdaUpdateWrapper<com.file.entity.Bucket>()
                            .eq(com.file.entity.Bucket::getBucketRealName, bucketName)
                            .eq(com.file.entity.Bucket::getUserId, userId)
                            .eq(com.file.entity.Bucket::getDeleted, false));
            if(i != 1) {
                log.error("重置状态异常，此bucket需被设置为未删除，需手动重置，userId：{}, bucketRealName：{}",
                        BaseContext.getUserInfo().getId(),
                        bucketName);
            }

            return com.file.common.Result.fail("bucket下存在文件，无法删除");
        }

        return com.file.common.Result.ok();
    }

    private Bucket getBucket(Long userId, String bucketRealName) {
        return bucketMapper.selectOne(new LambdaQueryWrapper<com.file.entity.Bucket>()
                .eq(com.file.entity.Bucket::getBucketRealName, bucketRealName)
                .eq(com.file.entity.Bucket::getUserId, userId)
                .eq(com.file.entity.Bucket::getDeleted, false));
    }

    @Override
    public com.file.common.Result renameBucket(String bucketName, String newName) {
        // 检查real_bucket是否存在
        Long userId = BaseContext.getUserInfo().getId();
        com.file.entity.Bucket bucket = getBucket(userId, bucketName);
        if(bucket == null) return com.file.common.Result.fail("尝试重命名一个不存在的存储桶");

        // 检查fake_bucket是否存在
        if(
                bucketMapper.selectOne(new LambdaQueryWrapper<com.file.entity.Bucket>()
                        .eq(com.file.entity.Bucket::getUserId, userId)
                        .eq(com.file.entity.Bucket::getBucketFakeName, newName)
                        .eq(com.file.entity.Bucket::getDeleted, false)) != null
        ) return com.file.common.Result.fail("存储桶已存在，重命名冲突");

        // 更新信息并存储
        bucket.setBucketFakeName(newName);
        bucket.setUpdateDate(LocalDateTime.now());
        int i = bucketMapper.updateById(bucket);
        if(i != 1) return com.file.common.Result.fail("重命名失败");

        return com.file.common.Result.ok();
    }

    @Override
    public com.file.common.Result checkFileChunkStatus(String bucketName, String prefix, String fileName) {
        Long userId = BaseContext.getUserInfo().getId();
        String path = prefix.isEmpty() ? prefix : prefix + "/";
        int i;
        // 检查目录是否存在
        Long bucketId = bucketMapper.queryIdByBucketRealName(userId, bucketName);
        i = dirMapper.checkDirExists(userId, path, bucketId);
        if(i != 1) return com.file.common.Result.fail("目录不存在");

        // 检查同一目录下是否存在同名文件
        Long dirId = dirMapper.selectIdByPath(userId, bucketId, path);
        i = fileMapper.checkFileExists(userId, fileName, dirId, bucketId);
        if(i == 1) return com.file.common.Result.fail("此目录下存在同名文件");

        FileChunkVO chunkVO = new FileChunkVO();
        chunkVO.setBucketName(bucketName);
        chunkVO.setPrefix(prefix);
        chunkVO.setFineName(fileName);

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

    @Override
    @SneakyThrows
    @Transactional
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
            boolean uploadAndSaved = mergeChunks(bucketName, prefix, fileName);
            if(!uploadAndSaved) {
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
                out.flush();

                // 构造file entity
                com.file.entity.File entity = new com.file.entity.File();
                entity.setUserId(BaseContext.getUserInfo().getId());
                entity.setName(fileName);
                entity.setCreateDate(LocalDateTime.now());
                // set bucketId
                Long userId = BaseContext.getUserInfo().getId();
                Long bucketId = bucketMapper.queryIdByBucketRealName(userId, bucketName);
                entity.setBucketId(bucketId);
                // set directoryId
                String path = prefix.isEmpty() ? prefix : prefix + "/";
                Long dirId = dirMapper.selectIdByPath(userId, bucketId, path);
                entity.setDirectoryId(dirId);

                try (FileInputStream in = new FileInputStream(FileConstant.CHUNK_FINAL_DIR + "\\" + fileName)) {
                    // 检查是否超出最大存储限制
                    StorageInfoVO vo = userMapper.queryUsedAndMaxById(userId);
                    long used = vo.getUsedSize() == null ? 0L : vo.getUsedSize();
                    if(used + in.available() > vo.getMaxStoreSize()) {
                        // 超出存储限制
                        return false;
                    }

                    entity.setSize((long) in.available());
                    // md5 hash，检查是否存在相同文件
                    byte[] allBytes = in.readAllBytes();
                    String md5 = FileUtil.md5Hash(allBytes);
                    Long fId = fileMapper.selectFileIdByMd5(md5);
                    if(fId != null) {
                        // 存在相同文件，无需上传，保存引用
                        entity.setPointer(fId);
                    } else {
                        // 上传
                        String prefixAndName = !prefix.isEmpty() ?
                                prefix.endsWith("/") ? prefix + fileName : prefix + "/" + fileName
                                : fileName;
                        cli.putObject(PutObjectArgs
                                .builder()
                                .bucket(bucketName)
                                .object(prefixAndName)
                                .stream(new ByteArrayInputStream(allBytes), allBytes.length, -1)
                                .build());

                        // 每个file，只保存一份hash value
                        entity.setHashValue(md5);
                    }
                }

                // 插入
                fileMapper.insert(entity);
                userMapper.addStorageSize(userId, entity.getSize());
            }
        } catch (Exception e) {
            log.warn("合并上传异常，文件：{}", fileName);
            return false;
        }

        // clean cache
        assert chunks != null;
        cleanCache(chunks, fileName, dir);

        return true;
    }

    @Override
    public com.file.common.Result getStorageInfo() {
        StorageInfoVO vo = userMapper.queryUsedAndMaxById(BaseContext.getUserInfo().getId());
        return com.file.common.Result.ok(vo);
    }

    private void cleanCache(File[] chunks, String fileName, File dir) {
        assert chunks != null;
        for (File ch : chunks) {
            boolean d = ch.delete();
            if(!d) log.warn("删除失败，{}:{}", fileName, ch.getName());
        }
        boolean d = dir.delete();
        if(!d) log.warn("文件临时目录删除失败，{}", fileName);

        boolean completedFileDeleted = new File(FileConstant.CHUNK_FINAL_DIR + "\\" + fileName).delete();
        if(!completedFileDeleted) log.warn("{}上传完成，cache清除失败", fileName);
    }
}
