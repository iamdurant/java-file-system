package com.file.mapper;

import com.file.entity.Bucket;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.file.pojo.SearchBucketDTO;
import org.apache.ibatis.annotations.*;

import java.util.List;

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

    @Select("select id from bucket where user_id = #{userId} and bucket_real_name = #{bucketRealName}")
    Long queryIdByBucketRealName(@Param("userId") Long userId, @Param("bucketRealName") String bucketRealName);

    @Select("select id from bucket where user_id = #{userId} and bucket_real_name = #{bucketRealName}")
    Long selectIdByBucketRealName(@Param("userId") Long userId, @Param("bucketRealName") String bucketRealName);

    @Select({
            "<script>",
            "SELECT id, bucket_real_name, bucket_fake_name FROM bucket",
            "WHERE user_id = #{userId}",
            "AND id IN",
            "<foreach item='id' collection='bucketIds' open='(' separator=',' close=')'>",
            "#{id}",
            "</foreach>",
            "</script>"
    })
    @Results({
            @Result(property = "bucketId", column = "id", javaType = Long.class),
            @Result(property = "bucketRealName", column = "bucket_real_name", javaType = String.class),
            @Result(property = "bucketFakeName", column = "bucket_fake_name", javaType = String.class)
    })
    List<SearchBucketDTO> queryBuckets(@Param("userId") Long userId, @Param("bucketIds") List<Long> bucketIds);
}
