package com.file.mapper;

import com.file.entity.Directory;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.file.pojo.SearchDirDTO;
import org.apache.ibatis.annotations.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * <p>
 * 文件夹表 Mapper 接口
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Mapper
public interface DirectoryMapper extends BaseMapper<Directory> {
    @Select("select count(*) from directory where user_id = #{userId} and path = #{path} and bucket_id = #{bucketId}")
    Integer checkDirExists(@Param("userId") Long userId,
                           @Param("path") String path,
                           @Param("bucketId") Long bucketId);

    @Insert("insert into directory (user_id, bucket_id, create_date, path) " +
            "values (#{userId}, #{bucketId}, #{createDate}, #{path})")
    void buildRoot(@Param("userId") Long userId,
                   @Param("bucketId") Long bucketId,
                   @Param("createDate") LocalDateTime createDate,
                   @Param("path") String path);

    @Delete("delete from directory where user_id = #{userId} and bucket_id = #{bucketId} and path = #{path}")
    void removeRoot(@Param("userId") Long userId,
                    @Param("bucketId") Long bucketId,
                    @Param("path") String path);

    @Select("select id from directory where user_id = #{userId} and path = #{path} and bucket_id = #{bucketId}")
    Long selectIdByPath(@Param("userId") Long userId,
                        @Param("bucketId") Long bucketId,
                        @Param("path") String path);

    @Select("select * from directory where user_id = #{userId} and bucket_id = #{bucketId} and path like concat(#{path}, '%')")
    List<Directory> queryDirByPath(@Param("userId") Long userId,
                                   @Param("bucketId") Long bucketId,
                                   @Param("path") String path);

    @Select({
            "<script>",
            "select id, path from directory where user_id = #{userId}",
            "and id in",
            "<foreach item='item' separator=',' open='(' close=')' collection='dirIds'>",
            "#{item}",
            "</foreach>",
            "</script>"

    })
    @Results({
            @Result(property = "dirId", column = "id", javaType = Long.class),
            @Result(property = "path", column = "path", javaType = String.class)
    })
    List<SearchDirDTO> queryDirs(@Param("userId") Long userId, @Param("dirIds") List<Long> dirIds);

    @Update("update directory set size = size + #{size} where id = #{dId}")
    void addStorageSize(@Param("dId") Long dId, @Param("size") Long size);

    @Select("select path from directory where id = #{dirId}")
    String selectPathById(@Param("dirId") Long dirId);

    @Select("select size from directory where user_id = #{userId} and bucket_id = #{bucketId} and path = #{path}")
    Long selectSizeByPath(@Param("userId") Long userId, @Param("bucketId") Long bucketId, @Param("path") String path);
}
