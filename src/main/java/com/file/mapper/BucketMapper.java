package com.file.mapper;

import com.file.entity.Bucket;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/**
 * <p>
 * 存储桶表 Mapper 接口
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Mapper
public interface BucketMapper extends BaseMapper<Bucket> {
    @Select("select count(*) from bucket where user_id = #{userId} and bucket_fake_name = #{bucketFakeName} and deleted = true")
    Integer checkExist(@Param("userId") Long userId, @Param("bucketFakeName") String bucketFakeName);

    @Update("update bucket set bucket_real_name = #{bucketRealName}, deleted = false where user_id = #{userId} and bucket_fake_name = #{bucketFakeName} and deleted = true")
    Integer updateStatus(@Param("userId") Long userId, @Param("bucketFakeName") String bucketFakeName, @Param("bucketRealName") String bucketRealName);
}
