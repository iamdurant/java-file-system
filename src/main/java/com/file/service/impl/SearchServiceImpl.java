package com.file.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.file.common.Result;
import com.file.common.SearchConstant;

import com.file.entity.File;
import com.file.mapper.BucketMapper;
import com.file.mapper.DirectoryMapper;
import com.file.mapper.FileMapper;
import com.file.pojo.SearchBucketDTO;
import com.file.pojo.SearchDirDTO;
import com.file.pojo.SearchResult;
import com.file.service.SearchService;
import com.file.util.BaseContext;
import com.file.util.DatetimeUtil;

import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {
    private final FileMapper fileMapper;

    private final BucketMapper bucketMapper;

    private final DirectoryMapper directoryMapper;

    @Override
    @SneakyThrows
    public Result searchFile(String name) {
        Long userId = BaseContext.getUserInfo().getId();
        List<SearchResult> result = new ArrayList<>();
        List<File> files = fileMapper.selectList(new LambdaQueryWrapper<File>()
                .eq(File::getUserId, userId)
                .like(File::getName, "%" + name + "%"));
        if(files == null || files.isEmpty()) return Result.ok(result);

        List<Long> bucketIds = new ArrayList<>();
        List<Long> dirIds = new ArrayList<>();
        for (File f : files) {
            bucketIds.add(f.getBucketId());
            dirIds.add(f.getDirectoryId());
        }

        Map<Long, SearchBucketDTO> bucketMap = new HashMap<>();
        Map<Long, String> dirMap = new HashMap<>();
        List<SearchBucketDTO> buckets = bucketMapper.queryBuckets(userId, bucketIds);
        for (SearchBucketDTO b : buckets) {
            bucketMap.put(b.getBucketId(), b);
        }
        List<SearchDirDTO> dirs = directoryMapper.queryDirs(userId, dirIds);
        for (SearchDirDTO d : dirs) {
            dirMap.put(d.getDirId(), d.getPath());
        }

        for (File f : files) {
            SearchResult re = new SearchResult();
            re.setSize(f.getSize());
            re.setDatetime(DatetimeUtil.format(f.getCreateDate()));
            SearchBucketDTO dto = bucketMap.get(f.getBucketId());
            re.setBucketRealName(dto.getBucketFakeName());
            re.setBucketName(dto.getBucketRealName());
            String path = dirMap.get(f.getDirectoryId());
            path = path.isEmpty() ? "" : path.substring(0, path.length() - 1);
            re.setPrefix(path);

            // 高亮匹配
            int[] pf = pf(name + "/" + f.getName());
            StringBuilder sb = getStringBuilder(name, pf, f.getName());
            re.setFileName(sb.toString());

            result.add(re);
        }

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
