package com.file.task;

import com.file.common.FileConstant;
import com.file.mapper.FileMapper;
import com.file.pojo.MinObjDTO;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class ScheduledTask {
    @Resource
    private MinioClient minCli;

    @Resource
    private FileMapper fileMapper;

    @Scheduled(fixedDelay = 5, timeUnit = TimeUnit.SECONDS)  // 5秒清理一次缓存
    public void cleanCache() {
        List<CleanCacheTask.Task> files = CleanCacheTask.sortAndGetCanCleanFile();
        for (CleanCacheTask.Task t : files) {
            String f = t.fileName;
            // 清理分片
            boolean done = true;
            File tmpDir = new File(FileConstant.CHUNK_TMP_DIR + "/" + f);
            if(tmpDir.exists()) {
                File[] chunks = tmpDir.listFiles();
                if(chunks != null) {
                    for (File chunk : chunks) {
                        boolean deleted = chunk.delete();
                        if(!deleted) {
                            log.warn("{} 清理失败", FileConstant.CHUNK_TMP_DIR + "/" + f + "/" + chunk.getName());
                            done = false;
                        }
                    }
                }
                boolean tmpDirDeleted = tmpDir.delete();
                if(!tmpDirDeleted) {
                    done = false;
                    log.warn("文件夹 {} 清理失败", tmpDir.getAbsolutePath());
                }
            }

            // 清理合并后的文件
            File finalFile = new File(FileConstant.CHUNK_FINAL_DIR + "/" + f);
            if(finalFile.exists()) {
                boolean deleted = finalFile.delete();
                if(!deleted) {
                    done = false;
                    log.warn("{} 清理失败", FileConstant.CHUNK_FINAL_DIR + "/" + f);
                }
            }

            if(done) CleanCacheTask.removeFile(t.userId, f);
        }
    }

    @Scheduled(cron = "0 */1 * * * ?")  // 每一分钟执行一次清理
    public void cleanFile() {
        List<CleanFileFromMinIOTask.Task> tasks = CleanFileFromMinIOTask.getCanConsume();
        for (CleanFileFromMinIOTask.Task t : tasks) {
            boolean deleted = true;
            try {
                minCli.removeObject(RemoveObjectArgs
                        .builder()
                        .bucket(t.bucketRealName)
                        .object(t.path + t.name)
                        .build());
            } catch (Exception e) {
                deleted = false;
                log.error("删除minio文件异常，bucket：{} file：{}", t.bucketRealName, t.path + t.name);
            }

            if(deleted) CleanFileFromMinIOTask.remove(t);
        }
    }

    @Scheduled(fixedDelay = 60, timeUnit = TimeUnit.SECONDS)  // 每分钟执行一次清理
    public void removeDeletedSource() {
        List<MinObjDTO> files = fileMapper.queryEmptyCitedOfSource();
        List<Long> removedIds = new ArrayList<>();

        for (MinObjDTO f : files) {
            boolean deleted = true;
            try {
                minCli.removeObject(
                        RemoveObjectArgs
                                .builder()
                                .bucket(f.getBucketRealName())
                                .object(f.getPath() + f.getName())
                                .build()
                );
            } catch(Exception e) {
                deleted = false;
            }
            if(deleted) removedIds.add(f.getFileId());
        }

        // 批量删除
        if(!removedIds.isEmpty()) fileMapper.deleteBatchIds(removedIds);
    }
}
