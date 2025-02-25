package com.file.service.impl;

import com.file.entity.Bucket;
import com.file.mapper.BucketMapper;
import com.file.service.IBucketService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 存储桶表 服务实现类
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Service
public class BucketServiceImpl extends ServiceImpl<BucketMapper, Bucket> implements IBucketService {

}
