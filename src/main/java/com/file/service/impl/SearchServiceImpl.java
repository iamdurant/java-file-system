package com.file.service.impl;

import com.file.ThreadPool.SearchFilePool;
import com.file.common.Result;
import com.file.common.SearchConstant;
import com.file.pojo.SearchResult;
import com.file.service.SearchService;
import com.file.util.DatetimeUtil;
import io.minio.ListObjectsArgs;
import io.minio.MinioClient;

import io.minio.messages.Bucket;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {
    private final MinioClient minCli;

    private final SearchFilePool pool;

    private final StringRedisTemplate redis;

    @Override
    @SneakyThrows
    public Result searchFile(String name) {
        CopyOnWriteArrayList<SearchResult> result = new CopyOnWriteArrayList<>();
        List<Bucket> buckets = minCli.listBuckets();
        CountDownLatch latch = new CountDownLatch(buckets.size());
        for (Bucket bucket : buckets) {
            pool.submitTask(() -> {
                String bucketRealName = redis.opsForValue().get(bucket.name());
                if(bucketRealName == null || bucketRealName.isEmpty()) {
                    log.error("bucket: [{}] 不存在名字映射", bucket.name());
                }

                Iterable<io.minio.Result<Item>> objects =
                        minCli.listObjects(ListObjectsArgs
                                .builder()
                                .bucket(bucket.name())
                                .recursive(true)
                                .build());

                for (io.minio.Result<Item> object : objects) {
                    Item item;
                    try {
                        item = object.get();
                    } catch (Exception e) {
                        latch.countDown();
                        throw new RuntimeException(e);
                    }

                    if(item != null && !item.isDir()) {
                        String objName = item.objectName();
                        int i = objName.lastIndexOf('/');
                        String lastName = objName.substring(i + 1);
                        if(!lastName.equals(".dir") && checkEqual(lastName, name)) {   // 匹配成功
                            // 匹配高亮  kmp匹配
                            int[] arr = pf(name + "/" + lastName);
                            StringBuilder sb = getStringBuilder(name, arr, lastName);

                            // 设置结果并添加
                            SearchResult ele = new SearchResult();
                            ele.setBucketRealName(bucketRealName);
                            ele.setFileName(sb.toString());
                            ele.setBucketName(bucket.name());
                            if(i != -1) ele.setPrefix(objName.substring(0, i));
                            else ele.setPrefix("");
                            ele.setSize(item.size());   // 设置文件大小
                            ele.setDatetime(DatetimeUtil.format(item.lastModified()));  // 设置时间

                            result.add(ele);
                        }
                    }
                }
                latch.countDown();
            });
        }

        latch.await(3, TimeUnit.SECONDS);
        return Result.ok(result);
    }

    @NotNull
    private StringBuilder getStringBuilder(String name, int[] arr, String lastName) {
        StringBuilder sb = new StringBuilder();
        int l = 0;
        int offset = (name.length() + 1);
        for(int k = 0; k < arr.length; k++) {
            if(arr[k] == name.length()) {
                // 匹配一次
                int left = k - offset - name.length() + 1;
                if(l < left) sb.append(lastName, l, left);
                sb.append(SearchConstant.EM_FIRST)
                        .append(lastName, left, k - offset + 1)
                        .append(SearchConstant.EM_LAST);
                l = k - offset + 1;
            }
        }
        if(l <= lastName.length() - 1) sb.append(lastName, l, lastName.length());
        return sb;
    }

    private boolean checkEqual(String text, String pattern) {
        int[] arr = pf(pattern + "/" + text);
        for(int len : arr) {
            if(len == pattern.length()) return true;
        }

        return false;
    }

    /**
     *
     * @param s 模式串/待匹配串
     * @return 前缀数组
     */
    @NotNull
    public int[] pf(String s) {
        char[] c = s.toCharArray();
        int n = c.length;
        int[] pi = new int[n];
        for(int i = 1;i < n;i++) {
            int secondLen = pi[i - 1];
            while(secondLen > 0 && !checkCharEqual(c[i], c[secondLen])) {
                secondLen = pi[secondLen - 1];
            }
            if(checkCharEqual(c[i], c[secondLen])) secondLen++;
            pi[i] = secondLen;
        }

        return pi;
    }

    private boolean checkCharEqual(char a, char b) {
        if((a >= 65 && a <= 90) && (b >= 97 && b <= 122)) {
            return a + 32 == b;
        }
        if((b >= 65 && b <= 90) && (a >= 97 && a <= 122)) {
            return b + 32 == a;
        }
        return a == b;
    }
}
