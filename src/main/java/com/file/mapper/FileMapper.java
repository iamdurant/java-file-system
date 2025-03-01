package com.file.mapper;

import com.file.entity.File;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.file.pojo.MinObjDTO;
import org.apache.ibatis.annotations.*;

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
            "and directory_id = #{directoryId} and bucket_id = #{bucketId} and deleted = false")
    Integer checkFileExists(@Param("userId") Long userId,
                            @Param("name") String name,
                            @Param("directoryId") Long directoryId,
                            @Param("bucketId") Long bucketId);

    @Select("select id from file where hash_value = #{md5}")
    Long selectFileIdByMd5(@Param("md5") String md5);

    @Select("select * from file where user_id = #{userId} and bucket_id = #{bucketId} and directory_id = #{dirId} and deleted = false")
    List<File> queryFilesByPath(@Param("userId") Long userId,
                                        @Param("bucketId") Long bucketId,
                                        @Param("dirId") Long dirId);

    @Update("update file set deleted = true where id = #{id}")
    void updateDeleted(@Param("id") Long id);

    @Select({
            "<script>",
            "select * from file where user_id = #{userId} and bucket_id = #{bucketId}",
            "and directory_id = #{dirId} and name in",
            "<foreach item='item' separator=',' open='(' close=')' collection='fileNames'>",
            "#{item}",
            "</foreach>",
            "</script>"
    })
    List<File> selectFilesByNames(@Param("userId") Long userId,
            @Param("bucketId") Long bucketId,
            @Param("dirId") Long dirId,
            @Param("fileNames") List<String> fileNames);

    @Update({
            "<script>",
            "update file set deleted = true",
            "where id in",
            "<foreach open='(' close=')' separator=',' item='id' collection='logicDeleteIds'>",
            "#{id}",
            "</foreach>",
            "</script>"
    })
    void updateDeletedBatchByIds(@Param("logicDeleteIds") List<Long> logicDeleteIds);

    @Update("update file set cited = cited + 1 where id = #{id}")
    void addCitedById(@Param("id") Long id);

    @Update("update file set cited = cited - 1 where id = #{id}")
    void decreaseCitedById(@Param("id") Long id);

    @Select("SELECT file.id as id, bucket.bucket_real_name AS a, directory.path AS b, file.name AS c FROM file " +
            "LEFT JOIN bucket ON file.bucket_id = bucket.id " +
            "LEFT JOIN directory ON file.directory_id = directory.id " +
            "WHERE file.hash_value IS NOT NULL AND file.cited = 0 AND file.deleted = true")
    @Results({
            @Result(property = "fileId", column = "id", javaType = Long.class),
            @Result(property = "bucketRealName", column = "a", javaType = String.class),
            @Result(property = "path", column = "b", javaType = String.class),
            @Result(property = "name", column = "c", javaType = String.class)
    })
    List<MinObjDTO> queryEmptyCitedOfSource();
}
