package com.file.task;

import com.file.common.FileConstant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.List;

@Component
@Slf4j
public class ScheduledTask {
    @Scheduled(cron = "0 */10 * * * ?")  // 每十分钟执行一次清理
    public void cleanCache() {
        List<String> files = CleanCacheTask.sortAndGetCanCleanFile();
        for (String f : files) {
            // 清理分片
            File tmpDir = new File(FileConstant.CHUNK_TMP_DIR + "/" + f);
            if(tmpDir.exists()) {
                File[] chunks = tmpDir.listFiles();
                if(chunks != null) {
                    for (File chunk : chunks) {
                        boolean deleted = chunk.delete();
                        if(!deleted) log.warn("{} 清理失败", FileConstant.CHUNK_TMP_DIR + "/" + f + "/" + chunk.getName());
                    }
                }
                boolean tmpDirDeleted = tmpDir.delete();
                if(!tmpDirDeleted) log.warn("文件夹 {} 清理失败", tmpDir.getAbsolutePath());
            }

            // 清理合并后的文件
            File finalFile = new File(FileConstant.CHUNK_FINAL_DIR + "/" + f);
            if(finalFile.exists()) {
                boolean deleted = finalFile.delete();
                if(!deleted) log.warn("{} 清理失败", FileConstant.CHUNK_FINAL_DIR + "/" + f);
            }
        }
    }
}
