package com.file.mapper;

import com.file.entity.File;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

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
            "and directory_id = (select id from directory where user_id = #{userId} and path = #{path})")
    Integer checkFileExists(@Param("userId") Long userId,
                            @Param("path") String path,
                            @Param("name") String name);

    @Select("select id from file where hash_value = #{md5}")
    Long selectFileIdByMd5(@Param("md5") String md5);
}
