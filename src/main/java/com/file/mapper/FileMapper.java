package com.file.mapper;

import com.file.entity.File;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * <p>
 * 文件表 Mapper 接口
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Mapper
public interface FileMapper extends BaseMapper<File> {
    @Select("select count(*) from file where user_id = #{userId} and name = #{name}" +
            "and directory_id = #{directoryId} and bucket_id = #{bucketId}")
    Integer checkFileExists(@Param("userId") Long userId,
                            @Param("name") String name,
                            @Param("directoryId") Long directoryId,
                            @Param("bucketId") Long bucketId);

    @Select("select id from file where hash_value = #{md5}")
    Long selectFileIdByMd5(@Param("md5") String md5);

    @Select("select * from file where user_id = #{userId} and bucket_id = #{bucketId} and directory_id = #{dirId}")
    List<File> queryFilesByPath(@Param("userId") Long userId,
                                        @Param("bucketId") Long bucketId,
                                        @Param("dirId") Long dirId);
}
